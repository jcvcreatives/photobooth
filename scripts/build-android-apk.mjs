import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const workDir = path.join(rootDir, '.apk_build');
const keyDir = path.join(rootDir, 'scripts', '.keystore');

function isUnusedChatAttachment(fileName) {
  return (
    fileName.endsWith('.apk') ||
    fileName.endsWith('.mov') ||
    fileName.startsWith('IMG_') ||
    fileName.startsWith('ScreenRecording_')
  );
}

function cleanUnusedAttachmentsFromDist(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      cleanUnusedAttachmentsFromDist(fullPath);
    } else if (isUnusedChatAttachment(entry)) {
      fs.rmSync(fullPath, { force: true });
    }
  }
}

// ============================================================================
// 1. ANDROID BINARY XML (AXML) COMPILER
// ============================================================================

const ATTR_RES_MAP = [
  { name: 'theme', id: 0x01010000 },
  { name: 'label', id: 0x01010001 },
  { name: 'icon', id: 0x01010002 },
  { name: 'name', id: 0x01010003 },
  { name: 'exported', id: 0x01010010 },
  { name: 'configChanges', id: 0x0101001f },
  { name: 'minSdkVersion', id: 0x0101020c },
  { name: 'versionCode', id: 0x0101021b },
  { name: 'versionName', id: 0x0101021c },
  { name: 'targetSdkVersion', id: 0x01010270 },
  { name: 'required', id: 0x0101028e },
  { name: 'hardwareAccelerated', id: 0x010102d3 },
];

const ANDROID_NS_URI = 'http://schemas.android.com/apk/res/android';
const ANDROID_NS_PREFIX = 'android';

function buildUtf16StringPool(strings) {
  const stringCount = strings.length;
  const encodedStrings = strings.map((s) => {
    const charLen = s.length;
    const buf = Buffer.alloc(2 + charLen * 2 + 2);
    buf.writeUInt16LE(charLen, 0);
    for (let i = 0; i < charLen; i++) {
      buf.writeUInt16LE(s.charCodeAt(i), 2 + i * 2);
    }
    buf.writeUInt16LE(0, 2 + charLen * 2);
    return buf;
  });

  const offsets = [];
  let curOffset = 0;
  for (const b of encodedStrings) {
    offsets.push(curOffset);
    curOffset += b.length;
  }

  const padLen = (4 - (curOffset % 4)) % 4;
  const stringsData = Buffer.concat([...encodedStrings, Buffer.alloc(padLen, 0)]);

  const headerSize = 28;
  const offsetsSize = stringCount * 4;
  const stringsStart = headerSize + offsetsSize;
  const totalSize = stringsStart + stringsData.length;

  const header = Buffer.alloc(headerSize + offsetsSize);
  header.writeUInt16LE(0x0001, 0); // RES_STRING_POOL_TYPE
  header.writeUInt16LE(headerSize, 2);
  header.writeUInt32LE(totalSize, 4);
  header.writeUInt32LE(stringCount, 8);
  header.writeUInt32LE(0, 12); // styleCount
  header.writeUInt32LE(0, 16); // flags (UTF-16)
  header.writeUInt32LE(stringsStart, 20);
  header.writeUInt32LE(0, 24); // stylesStart

  for (let i = 0; i < stringCount; i++) {
    header.writeUInt32LE(offsets[i], headerSize + i * 4);
  }

  return Buffer.concat([header, stringsData]);
}

function buildBinaryAndroidManifest() {
  // First N strings MUST match ATTR_RES_MAP 1-to-1
  const poolStrings = ATTR_RES_MAP.map((a) => a.name);
  const strIndexMap = new Map();
  poolStrings.forEach((s, idx) => strIndexMap.set(s, idx));

  function getStrIdx(s) {
    if (!strIndexMap.has(s)) {
      strIndexMap.set(s, poolStrings.length);
      poolStrings.push(s);
    }
    return strIndexMap.get(s);
  }

  // Pre-register namespace and common strings
  const nsPrefixIdx = getStrIdx(ANDROID_NS_PREFIX);
  const nsUriIdx = getStrIdx(ANDROID_NS_URI);

  // Value types:
  // TYPE_REFERENCE = 0x01, TYPE_STRING = 0x03, TYPE_INT_DEC = 0x10, TYPE_INT_HEX = 0x11, TYPE_INT_BOOLEAN = 0x12
  const manifestTree = {
    tag: 'manifest',
    attrs: [
      { ns: true, name: 'versionCode', type: 0x10, data: 300 },
      { ns: true, name: 'versionName', type: 0x03, data: '3.0.0' },
      { ns: false, name: 'package', type: 0x03, data: 'com.jcvcreatives.photobooth' },
    ],
    children: [
      {
        tag: 'uses-sdk',
        attrs: [
          { ns: true, name: 'minSdkVersion', type: 0x10, data: 21 },
          { ns: true, name: 'targetSdkVersion', type: 0x10, data: 28 },
        ],
        children: [],
      },
      ...[
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.ACCESS_WIFI_STATE',
        'android.permission.CAMERA',
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ].map((perm) => ({
        tag: 'uses-permission',
        attrs: [{ ns: true, name: 'name', type: 0x03, data: perm }],
        children: [],
      })),
      ...[
        'android.hardware.camera',
        'android.hardware.camera.front',
        'android.hardware.bluetooth',
        'android.hardware.usb.host',
      ].map((feat) => ({
        tag: 'uses-feature',
        attrs: [
          { ns: true, name: 'name', type: 0x03, data: feat },
          { ns: true, name: 'required', type: 0x12, data: 0 },
        ],
        children: [],
      })),
      {
        tag: 'application',
        attrs: [
          { ns: true, name: 'theme', type: 0x01, data: 0x0103000a }, // @android:style/Theme.Light.NoTitleBar.Fullscreen
          { ns: true, name: 'label', type: 0x03, data: 'JCVcreatives Photobooth' },
          { ns: true, name: 'icon', type: 0x01, data: 0x7f010000 }, // @drawable/ic_launcher
          { ns: true, name: 'hardwareAccelerated', type: 0x12, data: 0xffffffff },
        ],
        children: [
          {
            tag: 'activity',
            attrs: [
              { ns: true, name: 'label', type: 0x03, data: 'JCVcreatives Photobooth' },
              { ns: true, name: 'name', type: 0x03, data: 'com.jcvcreatives.photobooth.MainActivity' },
              { ns: true, name: 'exported', type: 0x12, data: 0xffffffff },
              { ns: true, name: 'configChanges', type: 0x11, data: 0x000004a0 },
            ],
            children: [
              {
                tag: 'intent-filter',
                attrs: [],
                children: [
                  {
                    tag: 'action',
                    attrs: [{ ns: true, name: 'name', type: 0x03, data: 'android.intent.action.MAIN' }],
                    children: [],
                  },
                  {
                    tag: 'category',
                    attrs: [{ ns: true, name: 'name', type: 0x03, data: 'android.intent.category.LAUNCHER' }],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  // Register all strings in tree
  function registerTreeStrings(node) {
    getStrIdx(node.tag);
    for (const a of node.attrs) {
      getStrIdx(a.name);
      if (a.type === 0x03) getStrIdx(String(a.data));
    }
    for (const c of node.children) registerTreeStrings(c);
  }
  registerTreeStrings(manifestTree);

  const xmlChunks = [];
  let lineNo = 1;

  // Start Namespace Chunk (0x0100)
  const startNs = Buffer.alloc(24);
  startNs.writeUInt16LE(0x0100, 0);
  startNs.writeUInt16LE(16, 2);
  startNs.writeUInt32LE(24, 4);
  startNs.writeUInt32LE(lineNo, 8);
  startNs.writeUInt32LE(0xffffffff, 12);
  startNs.writeUInt32LE(nsPrefixIdx, 16);
  startNs.writeUInt32LE(nsUriIdx, 20);
  xmlChunks.push(startNs);

  function emitNode(node) {
    lineNo++;
    const attrCount = node.attrs.length;
    const startElSize = 36 + attrCount * 20;
    const startEl = Buffer.alloc(startElSize);
    startEl.writeUInt16LE(0x0102, 0); // RES_XML_START_ELEMENT_TYPE
    startEl.writeUInt16LE(16, 2);
    startEl.writeUInt32LE(startElSize, 4);
    startEl.writeUInt32LE(lineNo, 8);
    startEl.writeUInt32LE(0xffffffff, 12);
    startEl.writeUInt32LE(0xffffffff, 16); // ns
    startEl.writeUInt32LE(getStrIdx(node.tag), 20); // name
    startEl.writeUInt16LE(20, 24); // attributeStart
    startEl.writeUInt16LE(20, 26); // attributeSize
    startEl.writeUInt16LE(attrCount, 28); // attributeCount
    startEl.writeUInt16LE(0, 30); // idIndex
    startEl.writeUInt16LE(0, 32); // classIndex
    startEl.writeUInt16LE(0, 34); // styleIndex

    for (let i = 0; i < attrCount; i++) {
      const a = node.attrs[i];
      const off = 36 + i * 20;
      startEl.writeUInt32LE(a.ns ? nsUriIdx : 0xffffffff, off);
      startEl.writeUInt32LE(getStrIdx(a.name), off + 4);
      if (a.type === 0x03) {
        const sIdx = getStrIdx(String(a.data));
        startEl.writeUInt32LE(sIdx, off + 8); // rawValue
        startEl.writeUInt16LE(8, off + 12);
        startEl.writeUInt8(0, off + 14);
        startEl.writeUInt8(0x03, off + 15);
        startEl.writeUInt32LE(sIdx, off + 16);
      } else {
        startEl.writeUInt32LE(0xffffffff, off + 8); // rawValue
        startEl.writeUInt16LE(8, off + 12);
        startEl.writeUInt8(0, off + 14);
        startEl.writeUInt8(a.type, off + 15);
        startEl.writeUInt32LE(a.data >>> 0, off + 16);
      }
    }
    xmlChunks.push(startEl);

    for (const c of node.children) emitNode(c);

    const endEl = Buffer.alloc(24);
    endEl.writeUInt16LE(0x0103, 0); // RES_XML_END_ELEMENT_TYPE
    endEl.writeUInt16LE(16, 2);
    endEl.writeUInt32LE(24, 4);
    endEl.writeUInt32LE(lineNo, 8);
    endEl.writeUInt32LE(0xffffffff, 12);
    endEl.writeUInt32LE(0xffffffff, 16);
    endEl.writeUInt32LE(getStrIdx(node.tag), 20);
    xmlChunks.push(endEl);
  }

  emitNode(manifestTree);

  // End Namespace Chunk (0x0101)
  const endNs = Buffer.alloc(24);
  endNs.writeUInt16LE(0x0101, 0);
  endNs.writeUInt16LE(16, 2);
  endNs.writeUInt32LE(24, 4);
  endNs.writeUInt32LE(lineNo, 8);
  endNs.writeUInt32LE(0xffffffff, 12);
  endNs.writeUInt32LE(nsPrefixIdx, 16);
  endNs.writeUInt32LE(nsUriIdx, 20);
  xmlChunks.push(endNs);

  const stringPoolChunk = buildUtf16StringPool(poolStrings);

  // Resource Map Chunk (0x0180)
  const resMapSize = 8 + ATTR_RES_MAP.length * 4;
  const resMapChunk = Buffer.alloc(resMapSize);
  resMapChunk.writeUInt16LE(0x0180, 0);
  resMapChunk.writeUInt16LE(8, 2);
  resMapChunk.writeUInt32LE(resMapSize, 4);
  ATTR_RES_MAP.forEach((a, idx) => {
    resMapChunk.writeUInt32LE(a.id >>> 0, 8 + idx * 4);
  });

  const body = Buffer.concat([stringPoolChunk, resMapChunk, ...xmlChunks]);
  const fileHeader = Buffer.alloc(8);
  fileHeader.writeUInt16LE(0x0003, 0); // RES_XML_TYPE
  fileHeader.writeUInt16LE(8, 2);
  fileHeader.writeUInt32LE(8 + body.length, 4);

  return Buffer.concat([fileHeader, body]);
}

// ============================================================================
// 2. RESOURCES.ARSC COMPILER (0x7f010000 -> res/drawable/ic_launcher.png)
// ============================================================================

function buildResourcesArsc() {
  const globalStringPool = buildUtf16StringPool(['res/drawable/ic_launcher.png']);
  const typeStringPool = buildUtf16StringPool(['drawable']);
  const keyStringPool = buildUtf16StringPool(['ic_launcher']);

  // TypeSpec chunk (0x0202)
  const typeSpec = Buffer.alloc(20);
  typeSpec.writeUInt16LE(0x0202, 0);
  typeSpec.writeUInt16LE(16, 2);
  typeSpec.writeUInt32LE(20, 4);
  typeSpec.writeUInt8(1, 8); // id = 1 (drawable)
  typeSpec.writeUInt8(0, 9);
  typeSpec.writeUInt16LE(0, 10);
  typeSpec.writeUInt32LE(1, 12); // entryCount = 1
  typeSpec.writeUInt32LE(0, 16); // flags[0] = 0

  // Type chunk (0x0201)
  // Header size = 20 + 64 (ResTable_config) = 84 bytes
  // Offset table = 4 bytes (1 entry) -> entriesStart = 88
  // Entry (ResTable_entry 8B + Res_value 8B) = 16 bytes -> total = 104 bytes
  const typeChunk = Buffer.alloc(104);
  typeChunk.writeUInt16LE(0x0201, 0);
  typeChunk.writeUInt16LE(84, 2);
  typeChunk.writeUInt32LE(104, 4);
  typeChunk.writeUInt8(1, 8); // id = 1
  typeChunk.writeUInt8(0, 9);
  typeChunk.writeUInt16LE(0, 10);
  typeChunk.writeUInt32LE(1, 12); // entryCount = 1
  typeChunk.writeUInt32LE(88, 16); // entriesStart = 88
  typeChunk.writeUInt32LE(64, 20); // config.size = 64
  // entryOffsets[0] at offset 84 = 0
  typeChunk.writeUInt32LE(0, 84);
  // ResTable_entry at offset 88
  typeChunk.writeUInt16LE(8, 88); // size = 8
  typeChunk.writeUInt16LE(0, 90); // flags = 0
  typeChunk.writeUInt32LE(0, 92); // key = 0 ('ic_launcher')
  // Res_value at offset 96
  typeChunk.writeUInt16LE(8, 96); // size = 8
  typeChunk.writeUInt8(0, 98); // res0 = 0
  typeChunk.writeUInt8(0x03, 99); // dataType = TYPE_STRING (0x03)
  typeChunk.writeUInt32LE(0, 100); // data = 0 (index 0 in globalStringPool)

  const pkgHeaderSize = 288;
  const pkgBody = Buffer.concat([typeStringPool, keyStringPool, typeSpec, typeChunk]);
  const pkgHeader = Buffer.alloc(pkgHeaderSize);
  pkgHeader.writeUInt16LE(0x0200, 0); // RES_TABLE_PACKAGE_TYPE
  pkgHeader.writeUInt16LE(pkgHeaderSize, 2);
  pkgHeader.writeUInt32LE(pkgHeaderSize + pkgBody.length, 4);
  pkgHeader.writeUInt32LE(0x7f, 8); // package id = 0x7f
  const pkgName = 'com.jcvcreatives.photobooth';
  for (let i = 0; i < pkgName.length; i++) {
    pkgHeader.writeUInt16LE(pkgName.charCodeAt(i), 12 + i * 2);
  }
  pkgHeader.writeUInt32LE(pkgHeaderSize, 268); // typeStrings offset
  pkgHeader.writeUInt32LE(1, 272); // lastPublicType
  pkgHeader.writeUInt32LE(pkgHeaderSize + typeStringPool.length, 276); // keyStrings offset
  pkgHeader.writeUInt32LE(1, 280); // lastPublicKey
  pkgHeader.writeUInt32LE(0, 284); // typeIdOffset

  const pkgChunk = Buffer.concat([pkgHeader, pkgBody]);
  const tableHeader = Buffer.alloc(12);
  tableHeader.writeUInt16LE(0x0002, 0); // RES_TABLE_TYPE
  tableHeader.writeUInt16LE(12, 2);
  tableHeader.writeUInt32LE(12 + globalStringPool.length + pkgChunk.length, 4);
  tableHeader.writeUInt32LE(1, 8); // packageCount = 1

  return Buffer.concat([tableHeader, globalStringPool, pkgChunk]);
}

// ============================================================================
// 3. PURE-NODE.JS DALVIK (CLASSES.DEX) ASSEMBLER
// ============================================================================

function writeUleb128(val) {
  const bytes = [];
  let v = val >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function writeSleb128(val) {
  const bytes = [];
  let v = val | 0;
  let more = true;
  while (more) {
    let b = v & 0x7f;
    v >>= 7;
    if ((v === 0 && (b & 0x40) === 0) || (v === -1 && (b & 0x40) !== 0)) {
      more = false;
    } else {
      b |= 0x80;
    }
    bytes.push(b);
  }
  return Buffer.from(bytes);
}

function adler32(buf) {
  const MOD_ADLER = 65521;
  let a = 1;
  let b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

function buildClassesDex() {
  const stringSet = new Set();
  const typeSet = new Set();
  const protoMap = new Map();
  const fieldMap = new Map();
  const methodMap = new Map();

  function addStr(s) {
    stringSet.add(s);
    return s;
  }

  function addType(t) {
    addStr(t);
    typeSet.add(t);
    return t;
  }

  function shortyOf(typeDesc) {
    if (typeDesc.startsWith('L') || typeDesc.startsWith('[')) return 'L';
    return typeDesc;
  }

  function addProto(retType, paramTypes = []) {
    const key = `(${paramTypes.join('')})${retType}`;
    if (!protoMap.has(key)) {
      addType(retType);
      paramTypes.forEach(addType);
      const shorty = shortyOf(retType) + paramTypes.map(shortyOf).join('');
      addStr(shorty);
      protoMap.set(key, { key, shorty, retType, paramTypes });
    }
    return key;
  }

  function addField(cls, name, type) {
    const key = `${cls}->${name}:${type}`;
    if (!fieldMap.has(key)) {
      addType(cls);
      addStr(name);
      addType(type);
      fieldMap.set(key, { key, cls, name, type });
    }
    return key;
  }

  function addMethod(cls, name, retType, paramTypes = []) {
    const protoKey = addProto(retType, paramTypes);
    const key = `${cls}->${name}${protoKey}`;
    if (!methodMap.has(key)) {
      addType(cls);
      addStr(name);
      methodMap.set(key, { key, cls, name, protoKey });
    }
    return key;
  }

  // Register classes, fields, methods, and strings needed for MainActivity, BridgeChromeClient, and AndroidPrinterBridge
  const T_OBJ = addType('Ljava/lang/Object;');
  const T_STR = addType('Ljava/lang/String;');
  const T_STR_ARR = addType('[Ljava/lang/String;');
  const T_BYTE_ARR = addType('[B');
  const T_VOID = addType('V');
  const T_INT = addType('I');
  const T_BOOL = addType('Z');
  const T_ACT = addType('Landroid/app/Activity;');
  const T_CTX = addType('Landroid/content/Context;');
  const T_BUNDLE = addType('Landroid/os/Bundle;');
  const T_WIN = addType('Landroid/view/Window;');
  const T_VIEW = addType('Landroid/view/View;');
  const T_WV = addType('Landroid/webkit/WebView;');
  const T_WS = addType('Landroid/webkit/WebSettings;');
  const T_WVC = addType('Landroid/webkit/WebViewClient;');
  const T_WCC = addType('Landroid/webkit/WebChromeClient;');
  const T_PREQ = addType('Landroid/webkit/PermissionRequest;');
  const T_JSINT = addType('Landroid/webkit/JavascriptInterface;');
  const T_BUILD_VER = addType('Landroid/os/Build$VERSION;');
  const T_INTENT = addType('Landroid/content/Intent;');
  const T_PINTENT = addType('Landroid/app/PendingIntent;');
  const T_USBMGR = addType('Landroid/hardware/usb/UsbManager;');
  const T_USBDEV = addType('Landroid/hardware/usb/UsbDevice;');
  const T_USBINTF = addType('Landroid/hardware/usb/UsbInterface;');
  const T_USBEP = addType('Landroid/hardware/usb/UsbEndpoint;');
  const T_USBCONN = addType('Landroid/hardware/usb/UsbDeviceConnection;');
  const T_BTADAPT = addType('Landroid/bluetooth/BluetoothAdapter;');
  const T_BTDEV = addType('Landroid/bluetooth/BluetoothDevice;');
  const T_BTCLASS = addType('Landroid/bluetooth/BluetoothClass;');
  const T_BTSOCK = addType('Landroid/bluetooth/BluetoothSocket;');
  const T_UUID = addType('Ljava/util/UUID;');
  const T_HASHMAP = addType('Ljava/util/HashMap;');
  const T_COLL = addType('Ljava/util/Collection;');
  const T_SET = addType('Ljava/util/Set;');
  const T_ITER = addType('Ljava/util/Iterator;');
  const T_B64 = addType('Landroid/util/Base64;');
  const T_OUTSTREAM = addType('Ljava/io/OutputStream;');
  const T_SOCK = addType('Ljava/net/Socket;');
  const T_EX = addType('Ljava/lang/Exception;');

  const T_CHROME = addType('Lcom/jcvcreatives/photobooth/BridgeChromeClient;');
  const T_BRIDGE = addType('Lcom/jcvcreatives/photobooth/AndroidPrinterBridge;');
  const T_MAIN = addType('Lcom/jcvcreatives/photobooth/MainActivity;');

  // Common string literals
  const S_PERM_CAM = addStr('android.permission.CAMERA');
  const S_PERM_BT = addStr('android.permission.BLUETOOTH');
  const S_PERM_BT_ADM = addStr('android.permission.BLUETOOTH_ADMIN');
  const S_PERM_BT_CON = addStr('android.permission.BLUETOOTH_CONNECT');
  const S_PERM_BT_SCN = addStr('android.permission.BLUETOOTH_SCAN');
  const S_PERM_LOC_FINE = addStr('android.permission.ACCESS_FINE_LOCATION');
  const S_PERM_LOC_COARSE = addStr('android.permission.ACCESS_COARSE_LOCATION');
  const S_JS_NAME = addStr('AndroidPrinter');
  const S_INDEX_URL = addStr('file:///android_asset/www/index.html');
  const S_USB_SVC = addStr('usb');
  const S_ACT_USB_PERM = addStr('com.jcvcreatives.photobooth.USB_PERMISSION');
  const S_ERR_NO_USB = addStr('ERR:No USB printer detected on OTG cord');
  const S_OK_USB = addStr('OK:USB Thermal Printer');
  const S_OK_PREFIX = addStr('OK:');
  const S_PENDING_USB = addStr('PENDING:Please tap Allow/OK on the USB permission prompt');
  const S_ERR_USB_PERM = addStr('ERR:Please tap Allow on the USB permission prompt and print again');
  const S_ERR_USB_EP = addStr('ERR:No writable USB endpoint found on printer');
  const S_OK = addStr('OK');
  const S_VER_300 = addStr('3.0.0');
  const S_ERR_NO_BT = addStr('ERR:Bluetooth is not supported on this tablet');
  const S_ACT_BT_EN = addStr('android.bluetooth.adapter.action.REQUEST_ENABLE');
  const S_ERR_BT_OFF = addStr('ERR:Bluetooth is turned off on tablet — please turn on Bluetooth');
  const S_ACT_BT_SET = addStr('android.settings.BLUETOOTH_SETTINGS');
  const S_FB_NO_BT = addStr('FALLBACK:No paired Bluetooth printer found — opening Android Bluetooth Settings to pair VOZY G80');
  const S_OK_BT = addStr('OK:VOZY G80 Bluetooth Printer');
  const S_SPP_UUID = addStr('00001101-0000-1000-8000-00805F9B34FB');
  const S_ERR_GEN = addStr('ERR:Printer connection failed — ensure printer is powered ON and paired');

  // Fields
  const F_SDK_INT = addField(T_BUILD_VER, 'SDK_INT', T_INT);
  const F_MAIN_WV = addField(T_MAIN, 'webView', T_WV);
  const F_BR_ACT = addField(T_BRIDGE, 'activity', T_ACT);
  const F_BR_USB = addField(T_BRIDGE, 'selectedUsbDevice', T_USBDEV);
  const F_BR_USBCONN = addField(T_BRIDGE, 'usbConn', T_USBCONN);
  const F_BR_USBEP = addField(T_BRIDGE, 'usbEp', T_USBEP);
  const F_BR_BT = addField(T_BRIDGE, 'selectedBtDevice', T_BTDEV);
  const F_BR_BTSOCK = addField(T_BRIDGE, 'btSocket', T_BTSOCK);

  // Methods
  const M_OBJ_INIT = addMethod(T_OBJ, '<init>', T_VOID, []);
  const M_ACT_INIT = addMethod(T_ACT, '<init>', T_VOID, []);
  const M_ACT_ONCREATE_SUPER = addMethod(T_ACT, 'onCreate', T_VOID, [T_BUNDLE]);
  const M_ACT_ONRESUME_SUPER = addMethod(T_ACT, 'onResume', T_VOID, []);
  const M_ACT_ONWIN_FOCUS_SUPER = addMethod(T_ACT, 'onWindowFocusChanged', T_VOID, [T_BOOL]);
  const M_ACT_REQ_FEAT = addMethod(T_ACT, 'requestWindowFeature', T_BOOL, [T_INT]);
  const M_ACT_GET_WIN = addMethod(T_ACT, 'getWindow', T_WIN, []);
  const M_WIN_SET_FLAGS = addMethod(T_WIN, 'setFlags', T_VOID, [T_INT, T_INT]);
  const M_WIN_GET_DECOR = addMethod(T_WIN, 'getDecorView', T_VIEW, []);
  const M_VIEW_SET_SYS_UI = addMethod(T_VIEW, 'setSystemUiVisibility', T_VOID, [T_INT]);
  const M_ACT_REQ_PERMS = addMethod(T_ACT, 'requestPermissions', T_VOID, [T_STR_ARR, T_INT]);
  const M_ACT_SET_CV = addMethod(T_ACT, 'setContentView', T_VOID, [T_VIEW]);
  const M_ACT_GET_SYS = addMethod(T_ACT, 'getSystemService', T_OBJ, [T_STR]);
  const M_ACT_START_ACT = addMethod(T_ACT, 'startActivity', T_VOID, [T_INTENT]);

  const M_WV_INIT = addMethod(T_WV, '<init>', T_VOID, [T_CTX]);
  const M_WV_SET_BG = addMethod(T_WV, 'setBackgroundColor', T_VOID, [T_INT]);
  const M_WV_GET_SET = addMethod(T_WV, 'getSettings', T_WS, []);
  const M_WV_SET_WVC = addMethod(T_WV, 'setWebViewClient', T_VOID, [T_WVC]);
  const M_WV_SET_WCC = addMethod(T_WV, 'setWebChromeClient', T_VOID, [T_WCC]);
  const M_WV_ADD_JS = addMethod(T_WV, 'addJavascriptInterface', T_VOID, [T_OBJ, T_STR]);
  const M_WV_LOAD_URL = addMethod(T_WV, 'loadUrl', T_VOID, [T_STR]);
  const M_WV_CAN_BACK = addMethod(T_WV, 'canGoBack', T_BOOL, []);
  const M_WV_GO_BACK = addMethod(T_WV, 'goBack', T_VOID, []);

  const M_WS_JS = addMethod(T_WS, 'setJavaScriptEnabled', T_VOID, [T_BOOL]);
  const M_WS_DOM = addMethod(T_WS, 'setDomStorageEnabled', T_VOID, [T_BOOL]);
  const M_WS_DB = addMethod(T_WS, 'setDatabaseEnabled', T_VOID, [T_BOOL]);
  const M_WS_FILE = addMethod(T_WS, 'setAllowFileAccess', T_VOID, [T_BOOL]);
  const M_WS_CONT = addMethod(T_WS, 'setAllowContentAccess', T_VOID, [T_BOOL]);
  const M_WS_FURL = addMethod(T_WS, 'setAllowFileAccessFromFileURLs', T_VOID, [T_BOOL]);
  const M_WS_UURL = addMethod(T_WS, 'setAllowUniversalAccessFromFileURLs', T_VOID, [T_BOOL]);
  const M_WS_MEDIA = addMethod(T_WS, 'setMediaPlaybackRequiresUserGesture', T_VOID, [T_BOOL]);
  const M_WS_OVW = addMethod(T_WS, 'setLoadWithOverviewMode', T_VOID, [T_BOOL]);
  const M_WS_WVP = addMethod(T_WS, 'setUseWideViewPort', T_VOID, [T_BOOL]);

  const M_WVC_INIT = addMethod(T_WVC, '<init>', T_VOID, []);
  const M_WCC_INIT = addMethod(T_WCC, '<init>', T_VOID, []);
  const M_PREQ_GET_RES = addMethod(T_PREQ, 'getResources', T_STR_ARR, []);
  const M_PREQ_GRANT = addMethod(T_PREQ, 'grant', T_VOID, [T_STR_ARR]);

  const M_CHROME_INIT = addMethod(T_CHROME, '<init>', T_VOID, []);
  const M_CHROME_ONPERM = addMethod(T_CHROME, 'onPermissionRequest', T_VOID, [T_PREQ]);

  const M_MAIN_INIT = addMethod(T_MAIN, '<init>', T_VOID, []);
  const M_MAIN_HIDE_SYS_UI = addMethod(T_MAIN, 'hideSystemUi', T_VOID, []);
  const M_MAIN_ONCREATE = addMethod(T_MAIN, 'onCreate', T_VOID, [T_BUNDLE]);
  const M_MAIN_ONRESUME = addMethod(T_MAIN, 'onResume', T_VOID, []);
  const M_MAIN_ONWIN_FOCUS = addMethod(T_MAIN, 'onWindowFocusChanged', T_VOID, [T_BOOL]);
  const M_MAIN_ONBACK = addMethod(T_MAIN, 'onBackPressed', T_VOID, []);

  // Printer Bridge & Android APIs
  const M_STR_CONCAT = addMethod(T_STR, 'concat', T_STR, [T_STR]);
  const M_INTENT_INIT = addMethod(T_INTENT, '<init>', T_VOID, [T_STR]);
  const M_PINTENT_BCAST = addMethod(T_PINTENT, 'getBroadcast', T_PINTENT, [T_CTX, T_INT, T_INTENT, T_INT]);
  const M_USBMGR_DEVS = addMethod(T_USBMGR, 'getDeviceList', T_HASHMAP, []);
  const M_USBMGR_HAS_PERM = addMethod(T_USBMGR, 'hasPermission', T_BOOL, [T_USBDEV]);
  const M_USBMGR_REQ_PERM = addMethod(T_USBMGR, 'requestPermission', T_VOID, [T_USBDEV, T_PINTENT]);
  const M_USBMGR_OPEN = addMethod(T_USBMGR, 'openDevice', T_USBCONN, [T_USBDEV]);
  const M_USBDEV_INTF_CNT = addMethod(T_USBDEV, 'getInterfaceCount', T_INT, []);
  const M_USBDEV_GET_INTF = addMethod(T_USBDEV, 'getInterface', T_USBINTF, [T_INT]);
  const M_USBINTF_EP_CNT = addMethod(T_USBINTF, 'getEndpointCount', T_INT, []);
  const M_USBINTF_GET_EP = addMethod(T_USBINTF, 'getEndpoint', T_USBEP, [T_INT]);
  const M_USBEP_GET_DIR = addMethod(T_USBEP, 'getDirection', T_INT, []);
  const M_USBCONN_CLAIM = addMethod(T_USBCONN, 'claimInterface', T_BOOL, [T_USBINTF, T_BOOL]);
  const M_USBCONN_BULK = addMethod(T_USBCONN, 'bulkTransfer', T_INT, [T_USBEP, T_BYTE_ARR, T_INT, T_INT]);
  const M_USBCONN_CLOSE = addMethod(T_USBCONN, 'close', T_VOID, []);

  const M_HASHMAP_EMPTY = addMethod(T_HASHMAP, 'isEmpty', T_BOOL, []);
  const M_HASHMAP_VALS = addMethod(T_HASHMAP, 'values', T_COLL, []);
  const M_COLL_ITER = addMethod(T_COLL, 'iterator', T_ITER, []);
  const M_SET_EMPTY = addMethod(T_SET, 'isEmpty', T_BOOL, []);
  const M_SET_ITER = addMethod(T_SET, 'iterator', T_ITER, []);
  const M_ITER_HAS_NEXT = addMethod(T_ITER, 'hasNext', T_BOOL, []);
  const M_ITER_NEXT = addMethod(T_ITER, 'next', T_OBJ, []);

  const M_BT_DEFAULT = addMethod(T_BTADAPT, 'getDefaultAdapter', T_BTADAPT, []);
  const M_BT_ENABLED = addMethod(T_BTADAPT, 'isEnabled', T_BOOL, []);
  const M_BT_CANCEL_DISC = addMethod(T_BTADAPT, 'cancelDiscovery', T_BOOL, []);
  const M_BT_BONDED = addMethod(T_BTADAPT, 'getBondedDevices', T_SET, []);
  const M_BTDEV_GET_NAME = addMethod(T_BTDEV, 'getName', T_STR, []);
  const M_BTDEV_GET_CLASS = addMethod(T_BTDEV, 'getBluetoothClass', T_BTCLASS, []);
  const M_BTCLASS_MAJOR = addMethod(T_BTCLASS, 'getMajorDeviceClass', T_INT, []);
  const M_BTDEV_RFCOMM = addMethod(T_BTDEV, 'createRfcommSocketToServiceRecord', T_BTSOCK, [T_UUID]);
  const M_BTDEV_INSECURE_RFCOMM = addMethod(T_BTDEV, 'createInsecureRfcommSocketToServiceRecord', T_BTSOCK, [T_UUID]);
  const M_BTSOCK_IS_CONN = addMethod(T_BTSOCK, 'isConnected', T_BOOL, []);
  const M_BTSOCK_CONN = addMethod(T_BTSOCK, 'connect', T_VOID, []);
  const M_BTSOCK_OUT = addMethod(T_BTSOCK, 'getOutputStream', T_OUTSTREAM, []);
  const M_BTSOCK_CLOSE = addMethod(T_BTSOCK, 'close', T_VOID, []);
  const M_UUID_FROM = addMethod(T_UUID, 'fromString', T_UUID, [T_STR]);
  const M_B64_DEC = addMethod(T_B64, 'decode', T_BYTE_ARR, [T_STR, T_INT]);
  const M_OUT_WRITE = addMethod(T_OUTSTREAM, 'write', T_VOID, [T_BYTE_ARR]);
  const M_OUT_FLUSH = addMethod(T_OUTSTREAM, 'flush', T_VOID, []);
  const M_OUT_CLOSE = addMethod(T_OUTSTREAM, 'close', T_VOID, []);
  const M_SOCK_INIT = addMethod(T_SOCK, '<init>', T_VOID, [T_STR, T_INT]);
  const M_SOCK_OUT = addMethod(T_SOCK, 'getOutputStream', T_OUTSTREAM, []);
  const M_SOCK_CLOSE = addMethod(T_SOCK, 'close', T_VOID, []);

  const M_BR_INIT = addMethod(T_BRIDGE, '<init>', T_VOID, [T_ACT]);
  const M_BR_HAS_USB = addMethod(T_BRIDGE, 'hasUsbPrinter', T_BOOL, []);
  const M_BR_CONN_USB = addMethod(T_BRIDGE, 'connectUsb', T_STR, []);
  const M_BR_PRT_USB = addMethod(T_BRIDGE, 'printUsbBase64', T_STR, [T_STR]);
  const M_BR_CONN_BT = addMethod(T_BRIDGE, 'connectBluetooth', T_STR, []);
  const M_BR_PRT_BT = addMethod(T_BRIDGE, 'printBluetoothBase64', T_STR, [T_STR]);
  const M_BR_PRT_TCP = addMethod(T_BRIDGE, 'printTcpBase64', T_STR, [T_STR, T_INT, T_STR]);
  const M_BR_TRY_BT = addMethod(T_BRIDGE, 'tryConnectBtSocket', T_BOOL, [T_BTDEV]);
  const M_BR_TRY_BT_SEC = addMethod(T_BRIDGE, 'tryConnectSecureBtSocket', T_BOOL, [T_BTDEV]);
  const M_BR_OPEN_BT_SET = addMethod(T_BRIDGE, 'openBluetoothSettings', T_STR, []);
  const M_BR_GET_VER = addMethod(T_BRIDGE, 'getBridgeVersion', T_STR, []);

  // Sort tables strictly according to Dalvik DEX specification
  const sortedStrings = Array.from(stringSet).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const strIdx = new Map();
  sortedStrings.forEach((s, i) => strIdx.set(s, i));

  const sortedTypes = Array.from(typeSet).sort((a, b) => strIdx.get(a) - strIdx.get(b));
  const typeIdx = new Map();
  sortedTypes.forEach((t, i) => typeIdx.set(t, i));

  const sortedProtos = Array.from(protoMap.values()).sort((a, b) => {
    const rDiff = typeIdx.get(a.retType) - typeIdx.get(b.retType);
    if (rDiff !== 0) return rDiff;
    const len = Math.min(a.paramTypes.length, b.paramTypes.length);
    for (let i = 0; i < len; i++) {
      const pDiff = typeIdx.get(a.paramTypes[i]) - typeIdx.get(b.paramTypes[i]);
      if (pDiff !== 0) return pDiff;
    }
    return a.paramTypes.length - b.paramTypes.length;
  });
  const protoIdx = new Map();
  sortedProtos.forEach((p, i) => protoIdx.set(p.key, i));

  const sortedFields = Array.from(fieldMap.values()).sort((a, b) => {
    const cDiff = typeIdx.get(a.cls) - typeIdx.get(b.cls);
    if (cDiff !== 0) return cDiff;
    const nDiff = strIdx.get(a.name) - strIdx.get(b.name);
    if (nDiff !== 0) return nDiff;
    return typeIdx.get(a.type) - typeIdx.get(b.type);
  });
  const fieldIdx = new Map();
  sortedFields.forEach((f, i) => fieldIdx.set(f.key, i));

  const sortedMethods = Array.from(methodMap.values()).sort((a, b) => {
    const cDiff = typeIdx.get(a.cls) - typeIdx.get(b.cls);
    if (cDiff !== 0) return cDiff;
    const nDiff = strIdx.get(a.name) - strIdx.get(b.name);
    if (nDiff !== 0) return nDiff;
    return protoIdx.get(a.protoKey) - protoIdx.get(b.protoKey);
  });
  const methodIdx = new Map();
  sortedMethods.forEach((m, i) => methodIdx.set(m.key, i));

  // Dalvik instruction encoding helpers (returns array of uint16 words)
  const opReturnVoid = () => [0x000e];
  const opReturn = (vA) => [0x000f | ((vA & 0xff) << 8)];
  const opReturnObj = (vA) => [0x0011 | ((vA & 0xff) << 8)];
  const opMoveResult = (vA) => [0x000a | ((vA & 0xff) << 8)];
  const opMoveResultObj = (vA) => [0x000c | ((vA & 0xff) << 8)];
  const opMoveException = (vA) => [0x000d | ((vA & 0xff) << 8)];
  const opConst4 = (vA, val4) => [0x0012 | ((vA & 0xf) << 8) | ((val4 & 0xf) << 12)];
  const opConst16 = (vA, val16) => [0x0013 | ((vA & 0xff) << 8), val16 & 0xffff];
  const opConst32 = (vA, val32) => [0x0014 | ((vA & 0xff) << 8), val32 & 0xffff, (val32 >>> 16) & 0xffff];
  const opConstStr = (vA, sKey) => [0x001a | ((vA & 0xff) << 8), strIdx.get(sKey)];
  const opCheckCast = (vA, tKey) => [0x001f | ((vA & 0xff) << 8), typeIdx.get(tKey)];
  const opNewInstance = (vA, tKey) => [0x0022 | ((vA & 0xff) << 8), typeIdx.get(tKey)];
  const opNewArray = (vA, vSize, tKey) => [0x0023 | ((vA & 0xf) << 8) | ((vSize & 0xf) << 12), typeIdx.get(tKey)];
  const opArrayLength = (vA, vArr) => [0x0021 | ((vA & 0xf) << 8) | ((vArr & 0xf) << 12)];
  const opAputObj = (vVal, vArr, vIdx) => [0x004d | ((vVal & 0xff) << 8), (vArr & 0xff) | ((vIdx & 0xff) << 8)];
  const opIgetObj = (vA, vObj, fKey) => [0x0054 | ((vA & 0xf) << 8) | ((vObj & 0xf) << 12), fieldIdx.get(fKey)];
  const opIputObj = (vA, vObj, fKey) => [0x005b | ((vA & 0xf) << 8) | ((vObj & 0xf) << 12), fieldIdx.get(fKey)];
  const opSgetInt = (vA, fKey) => [0x0060 | ((vA & 0xff) << 8), fieldIdx.get(fKey)];
  const opAddIntLit8 = (vA, vB, lit8) => [0x00d8 | ((vA & 0xff) << 8), (vB & 0xff) | ((lit8 & 0xff) << 8)];
  const opIfEq = (vA, vB, targetLabel) => ({
    type: 'branch22',
    op: 0x0032 | ((vA & 0xf) << 8) | ((vB & 0xf) << 12),
    targetLabel,
  });
  const opIfGe = (vA, vB, targetLabel) => ({
    type: 'branch22',
    op: 0x0035 | ((vA & 0xf) << 8) | ((vB & 0xf) << 12),
    targetLabel,
  });
  const opIfEqz = (vA, targetLabel) => ({ type: 'branch21', op: 0x0038 | ((vA & 0xff) << 8), targetLabel });
  const opIfNez = (vA, targetLabel) => ({ type: 'branch21', op: 0x0039 | ((vA & 0xff) << 8), targetLabel });
  const opIfLt = (vA, vB, targetLabel) => ({
    type: 'branch22',
    op: 0x0034 | ((vA & 0xf) << 8) | ((vB & 0xf) << 12),
    targetLabel,
  });
  const opGoto = (targetLabel) => ({ type: 'goto16', op: 0x0029, targetLabel });
  const label = (name) => ({ type: 'label', name });

  function resolveWords(items) {
    const labelOffsets = new Map();
    let wordOffset = 0;
    for (const item of items) {
      if (typeof item === 'number') {
        wordOffset += 1;
      } else if (item && item.type === 'label') {
        labelOffsets.set(item.name, wordOffset);
      } else if (item && (item.type === 'branch21' || item.type === 'branch22' || item.type === 'goto16')) {
        wordOffset += 2;
      }
    }

    const words = [];
    let curWord = 0;
    for (const item of items) {
      if (typeof item === 'number') {
        words.push(item & 0xffff);
        curWord += 1;
      } else if (item && (item.type === 'branch21' || item.type === 'branch22' || item.type === 'goto16')) {
        const target = labelOffsets.get(item.targetLabel);
        if (target === undefined) {
          throw new Error(`Unresolved Dalvik branch label: ${item.targetLabel}`);
        }
        const rel = target - curWord;
        words.push(item.op & 0xffff, rel & 0xffff);
        curWord += 2;
      }
    }
    return words;
  }

  function opInvoke(opByte, mKey, args) {
    const count = args.length;
    const g = count >= 5 ? args[4] & 0xf : 0;
    const w0 = opByte | (g << 8) | ((count & 0xf) << 12);
    const w1 = methodIdx.get(mKey);
    const c = count >= 1 ? args[0] & 0xf : 0;
    const d = count >= 2 ? args[1] & 0xf : 0;
    const e = count >= 3 ? args[2] & 0xf : 0;
    const f = count >= 4 ? args[3] & 0xf : 0;
    const w2 = c | (d << 4) | (e << 8) | (f << 12);
    return [w0, w1, w2];
  }
  const opInvokeVirtual = (mKey, args) => opInvoke(0x6e, mKey, args);
  const opInvokeSuper = (mKey, args) => opInvoke(0x6f, mKey, args);
  const opInvokeDirect = (mKey, args) => opInvoke(0x70, mKey, args);
  const opInvokeStatic = (mKey, args) => opInvoke(0x71, mKey, args);
  const opInvokeInterface = (mKey, args) => opInvoke(0x72, mKey, args);

  function makeCodeItem(registersSize, insSize, outsSize, rawItems, tryCatchItems = null) {
    const words = resolveWords(rawItems);
    let tryCatch = null;
    if (tryCatchItems) {
      const tryWords = resolveWords(tryCatchItems.tryItems);
      const catchWords = resolveWords(tryCatchItems.catchItems);
      words.push(...tryWords, ...catchWords);
      tryCatch = {
        startAddr: 0,
        insnCount: tryWords.length,
        catchAddr: tryWords.length,
      };
    }
    const insnsSize = words.length;
    const padWords = tryCatch && insnsSize % 2 === 1 ? 1 : 0;
    const headerBuf = Buffer.alloc(16 + (insnsSize + padWords) * 2);
    headerBuf.writeUInt16LE(registersSize, 0);
    headerBuf.writeUInt16LE(insSize, 2);
    headerBuf.writeUInt16LE(outsSize, 4);
    headerBuf.writeUInt16LE(tryCatch ? 1 : 0, 6);
    headerBuf.writeUInt32LE(0, 8); // debug_info_off
    headerBuf.writeUInt32LE(insnsSize, 12);
    for (let i = 0; i < insnsSize; i++) {
      headerBuf.writeUInt16LE(words[i] & 0xffff, 16 + i * 2);
    }
    if (!tryCatch) return headerBuf;

    const tryBuf = Buffer.alloc(8);
    tryBuf.writeUInt32LE(tryCatch.startAddr, 0);
    tryBuf.writeUInt16LE(tryCatch.insnCount, 4);
    tryBuf.writeUInt16LE(1, 6); // handler_off = 1

    const handlerBuf = Buffer.concat([
      writeUleb128(1), // 1 catch handler
      writeSleb128(1), // 1 typed catch pair
      writeUleb128(typeIdx.get(T_EX)),
      writeUleb128(tryCatch.catchAddr),
    ]);
    return Buffer.concat([headerBuf, tryBuf, handlerBuf]);
  }

  // ---- Build Class 1: BridgeChromeClient ----
  const codeChromeInit = makeCodeItem(1, 1, 1, [
    ...opInvokeDirect(M_WCC_INIT, [0]),
    ...opReturnVoid(),
  ]);

  const codeChromeOnPerm = makeCodeItem(3, 2, 2, [
    // v1 = this, v2 = PermissionRequest
    ...opInvokeVirtual(M_PREQ_GET_RES, [2]),
    ...opMoveResultObj(0),
    ...opInvokeVirtual(M_PREQ_GRANT, [2, 0]),
    ...opReturnVoid(),
  ]);

  // ---- Build Class 2: MainActivity ----
  const codeMainInit = makeCodeItem(1, 1, 1, [
    ...opInvokeDirect(M_ACT_INIT, [0]),
    ...opReturnVoid(),
  ]);

  // MainActivity.hideSystemUi(): v2 = this
  // Applies IMMERSIVE_STICKY | HIDE_NAVIGATION | FULLSCREEN | LAYOUT_HIDE_NAVIGATION | LAYOUT_FULLSCREEN | LAYOUT_STABLE (0x1706)
  // to both Window.getDecorView() and this.webView so the bottom navigation bar (||| O <) stays completely hidden.
  const codeMainHideSysUi = makeCodeItem(3, 1, 2, [
    ...opInvokeVirtual(M_ACT_GET_WIN, [2]),
    ...opMoveResultObj(0),
    opIfEqz(0, 'hide_wv'),
    ...opInvokeVirtual(M_WIN_GET_DECOR, [0]),
    ...opMoveResultObj(0),
    opIfEqz(0, 'hide_wv'),
    ...opConst16(1, 0x1706),
    ...opInvokeVirtual(M_VIEW_SET_SYS_UI, [0, 1]),
    label('hide_wv'),
    ...opIgetObj(0, 2, F_MAIN_WV),
    opIfEqz(0, 'done_hide'),
    ...opConst16(1, 0x1706),
    ...opInvokeVirtual(M_VIEW_SET_SYS_UI, [0, 1]),
    label('done_hide'),
    ...opReturnVoid(),
  ]);

  // MainActivity.onResume(): v0 = this
  const codeMainOnResume = makeCodeItem(1, 1, 1, [
    ...opInvokeSuper(M_ACT_ONRESUME_SUPER, [0]),
    ...opInvokeVirtual(M_MAIN_HIDE_SYS_UI, [0]),
    ...opReturnVoid(),
  ]);

  // MainActivity.onWindowFocusChanged(boolean): v0 = this, v1 = hasFocus
  const codeMainOnWinFocus = makeCodeItem(2, 2, 2, [
    ...opInvokeSuper(M_ACT_ONWIN_FOCUS_SUPER, [0, 1]),
    ...opInvokeVirtual(M_MAIN_HIDE_SYS_UI, [0]),
    ...opReturnVoid(),
  ]);

  // MainActivity.onCreate(Bundle):
  // v6 = this, v7 = Bundle
  const mainOnCreateWords = [
    ...opInvokeSuper(M_ACT_ONCREATE_SUPER, [6, 7]),
    ...opConst4(0, 1), // Window.FEATURE_NO_TITLE = 1
    ...opInvokeVirtual(M_ACT_REQ_FEAT, [6, 0]),
    ...opInvokeVirtual(M_ACT_GET_WIN, [6]),
    ...opMoveResultObj(0),
    ...opConst16(1, 0x0480), // FLAG_FULLSCREEN | FLAG_KEEP_SCREEN_ON
    ...opInvokeVirtual(M_WIN_SET_FLAGS, [0, 1, 1]),
    ...opInvokeVirtual(M_MAIN_HIDE_SYS_UI, [6]),
    // Create and mount WebView FIRST with warm cream (#faf8f5) background before permission checks
    // so cold start renders immediately without a multi-second black/white flash.
    ...opNewInstance(0, T_WV),
    ...opInvokeDirect(M_WV_INIT, [0, 6]),
    ...opIputObj(0, 6, F_MAIN_WV),
    ...opConst32(1, 0xfffaf8f5),
    ...opInvokeVirtual(M_WV_SET_BG, [0, 1]),
    ...opInvokeVirtual(M_WV_GET_SET, [0]),
    ...opMoveResultObj(1),
    ...opConst4(2, 1), // true
    ...opConst4(3, 0), // false
    ...opInvokeVirtual(M_WS_JS, [1, 2]),
    ...opInvokeVirtual(M_WS_DOM, [1, 2]),
    ...opInvokeVirtual(M_WS_DB, [1, 2]),
    ...opInvokeVirtual(M_WS_FILE, [1, 2]),
    ...opInvokeVirtual(M_WS_CONT, [1, 2]),
    ...opInvokeVirtual(M_WS_FURL, [1, 2]),
    ...opInvokeVirtual(M_WS_UURL, [1, 2]),
    ...opInvokeVirtual(M_WS_MEDIA, [1, 3]),
    ...opInvokeVirtual(M_WS_OVW, [1, 2]),
    ...opInvokeVirtual(M_WS_WVP, [1, 2]),
    // Set WebViewClient
    ...opNewInstance(2, T_WVC),
    ...opInvokeDirect(M_WVC_INIT, [2]),
    ...opInvokeVirtual(M_WV_SET_WVC, [0, 2]),
    // Set BridgeChromeClient
    ...opNewInstance(2, T_CHROME),
    ...opInvokeDirect(M_CHROME_INIT, [2]),
    ...opInvokeVirtual(M_WV_SET_WCC, [0, 2]),
    // Add JavascriptInterface ("AndroidPrinter")
    ...opNewInstance(2, T_BRIDGE),
    ...opInvokeDirect(M_BR_INIT, [2, 6]),
    ...opConstStr(3, S_JS_NAME),
    ...opInvokeVirtual(M_WV_ADD_JS, [0, 2, 3]),
    // setContentView & loadUrl immediately
    ...opInvokeVirtual(M_ACT_SET_CV, [6, 0]),
    ...opConstStr(2, S_INDEX_URL),
    ...opInvokeVirtual(M_WV_LOAD_URL, [0, 2]),
    ...opInvokeVirtual(M_MAIN_HIDE_SYS_UI, [6]),
    // Check SDK_INT >= 23 for Android 6–14+ Camera + Bluetooth + Location permissions
    ...opSgetInt(0, F_SDK_INT),
    ...opConst16(1, 23),
    opIfLt(0, 1, 'done_create'),
    ...opConst4(1, 7),
    ...opNewArray(2, 1, T_STR_ARR),
    ...opConst4(3, 0),
    ...opConstStr(4, S_PERM_CAM),
    ...opAputObj(4, 2, 3),
    ...opConst4(3, 1),
    ...opConstStr(4, S_PERM_BT),
    ...opAputObj(4, 2, 3),
    ...opConst4(3, 2),
    ...opConstStr(4, S_PERM_BT_ADM),
    ...opAputObj(4, 2, 3),
    ...opConst4(3, 3),
    ...opConstStr(4, S_PERM_BT_CON),
    ...opAputObj(4, 2, 3),
    ...opConst4(3, 4),
    ...opConstStr(4, S_PERM_BT_SCN),
    ...opAputObj(4, 2, 3),
    ...opConst4(3, 5),
    ...opConstStr(4, S_PERM_LOC_FINE),
    ...opAputObj(4, 2, 3),
    ...opConst4(3, 6),
    ...opConstStr(4, S_PERM_LOC_COARSE),
    ...opAputObj(4, 2, 3),
    ...opConst16(3, 1001),
    ...opInvokeVirtual(M_ACT_REQ_PERMS, [6, 2, 3]),
    label('done_create'),
    ...opReturnVoid(),
  ];
  const codeMainOnCreate = makeCodeItem(8, 2, 3, mainOnCreateWords);

  // MainActivity.onBackPressed(): v0 = this
  // Kiosk lock: re-assert immersive sticky fullscreen and ignore accidental system back presses
  const codeMainOnBack = makeCodeItem(1, 1, 1, [
    ...opInvokeVirtual(M_MAIN_HIDE_SYS_UI, [0]),
    ...opReturnVoid(),
  ]);

  // ---- Build Class 3: AndroidPrinterBridge ----
  // <init>(Activity): v0 = this, v1 = Activity
  const codeBrInit = makeCodeItem(2, 2, 1, [
    ...opInvokeDirect(M_OBJ_INIT, [0]),
    ...opIputObj(1, 0, F_BR_ACT),
    ...opReturnVoid(),
  ]);

  // getBridgeVersion()String: v1 = this
  const codeBrGetVer = makeCodeItem(2, 1, 0, [
    ...opConstStr(0, S_VER_300),
    ...opReturnObj(0),
  ]);

  // openBluetoothSettings()String: v3 = this
  const codeBrOpenBtSet = makeCodeItem(4, 1, 2, [], {
    tryItems: [
      ...opNewInstance(0, T_INTENT),
      ...opConstStr(1, S_ACT_BT_SET),
      ...opInvokeDirect(M_INTENT_INIT, [0, 1]),
      ...opIgetObj(1, 3, F_BR_ACT),
      ...opInvokeVirtual(M_ACT_START_ACT, [1, 0]),
      ...opConstStr(0, S_OK),
      ...opReturnObj(0),
    ],
    catchItems: [...opMoveException(0), ...opConstStr(0, S_ERR_NO_BT), ...opReturnObj(0)],
  });

  // tryConnectBtSocket(BluetoothDevice)Z: v3 = this, v4 = BluetoothDevice
  const codeBrTryBt = makeCodeItem(5, 2, 2, [], {
    tryItems: [
      ...opInvokeStatic(M_BT_DEFAULT, []),
      ...opMoveResultObj(0),
      opIfEqz(0, 'no_disc_insec'),
      ...opInvokeVirtual(M_BT_CANCEL_DISC, [0]),
      label('no_disc_insec'),
      ...opConstStr(0, S_SPP_UUID),
      ...opInvokeStatic(M_UUID_FROM, [0]),
      ...opMoveResultObj(0),
      ...opInvokeVirtual(M_BTDEV_INSECURE_RFCOMM, [4, 0]),
      ...opMoveResultObj(1),
      ...opInvokeVirtual(M_BTSOCK_CONN, [1]),
      ...opIputObj(1, 3, F_BR_BTSOCK),
      ...opIputObj(4, 3, F_BR_BT),
      ...opConst4(0, 1),
      ...opReturn(0),
    ],
    catchItems: [...opMoveException(0), ...opConst4(0, 0), ...opReturn(0)],
  });

  // tryConnectSecureBtSocket(BluetoothDevice)Z: v3 = this, v4 = BluetoothDevice
  const codeBrTryBtSec = makeCodeItem(5, 2, 2, [], {
    tryItems: [
      ...opInvokeStatic(M_BT_DEFAULT, []),
      ...opMoveResultObj(0),
      opIfEqz(0, 'no_disc_sec'),
      ...opInvokeVirtual(M_BT_CANCEL_DISC, [0]),
      label('no_disc_sec'),
      ...opConstStr(0, S_SPP_UUID),
      ...opInvokeStatic(M_UUID_FROM, [0]),
      ...opMoveResultObj(0),
      ...opInvokeVirtual(M_BTDEV_RFCOMM, [4, 0]),
      ...opMoveResultObj(1),
      ...opInvokeVirtual(M_BTSOCK_CONN, [1]),
      ...opIputObj(1, 3, F_BR_BTSOCK),
      ...opIputObj(4, 3, F_BR_BT),
      ...opConst4(0, 1),
      ...opReturn(0),
    ],
    catchItems: [...opMoveException(0), ...opConst4(0, 0), ...opReturn(0)],
  });

  // hasUsbPrinter()Z: v3 = this
  const codeBrHasUsb = makeCodeItem(4, 1, 2, [], {
    tryItems: [
      ...opIgetObj(0, 3, F_BR_ACT),
      ...opConstStr(1, S_USB_SVC),
      ...opInvokeVirtual(M_ACT_GET_SYS, [0, 1]),
      ...opMoveResultObj(0),
      ...opCheckCast(0, T_USBMGR),
      ...opInvokeVirtual(M_USBMGR_DEVS, [0]),
      ...opMoveResultObj(0),
      ...opInvokeVirtual(M_HASHMAP_EMPTY, [0]),
      ...opMoveResult(0),
      opIfNez(0, 'usb_empty'),
      ...opConst4(0, 1),
      ...opReturn(0),
      label('usb_empty'),
      ...opConst4(0, 0),
      ...opReturn(0),
    ],
    catchItems: [...opMoveException(0), ...opConst4(0, 0), ...opReturn(0)],
  });

  // connectUsb()Ljava/lang/String;: v5 = this
  // Safe PendingIntent flags for Android 7–14+: uses FLAG_MUTABLE (33554432) only on SDK_INT >= 31, else 0.
  // Returns "OK:USB Thermal Printer" ONLY when permission is granted; if permission was just requested, returns "PENDING:Please tap Allow/OK on the USB permission prompt".
  const codeBrConnUsb = makeCodeItem(6, 1, 4, [], {
    tryItems: [
      ...opIgetObj(0, 5, F_BR_ACT),
      ...opConstStr(1, S_USB_SVC),
      ...opInvokeVirtual(M_ACT_GET_SYS, [0, 1]),
      ...opMoveResultObj(0),
      ...opCheckCast(0, T_USBMGR),
      ...opInvokeVirtual(M_USBMGR_DEVS, [0]),
      ...opMoveResultObj(1),
      ...opInvokeVirtual(M_HASHMAP_EMPTY, [1]),
      ...opMoveResult(2),
      opIfEqz(2, 'has_usb_dev'),
      ...opConstStr(2, S_ERR_NO_USB),
      ...opReturnObj(2),
      label('has_usb_dev'),
      ...opInvokeVirtual(M_HASHMAP_VALS, [1]),
      ...opMoveResultObj(1),
      ...opInvokeInterface(M_COLL_ITER, [1]),
      ...opMoveResultObj(1),
      ...opInvokeInterface(M_ITER_NEXT, [1]),
      ...opMoveResultObj(1),
      ...opCheckCast(1, T_USBDEV),
      ...opIputObj(1, 5, F_BR_USB),
      ...opInvokeVirtual(M_USBMGR_HAS_PERM, [0, 1]),
      ...opMoveResult(2),
      opIfNez(2, 'usb_perm_ok'),
      ...opNewInstance(2, T_INTENT),
      ...opConstStr(3, S_ACT_USB_PERM),
      ...opInvokeDirect(M_INTENT_INIT, [2, 3]),
      ...opSgetInt(3, F_SDK_INT),
      ...opConst16(4, 31),
      ...opConst4(1, 0),
      opIfLt(3, 4, 'pintent_ready'),
      ...opConst32(1, 33554432), // FLAG_MUTABLE on Android 12+
      label('pintent_ready'),
      ...opIgetObj(3, 5, F_BR_ACT),
      ...opConst4(4, 0),
      ...opInvokeStatic(M_PINTENT_BCAST, [3, 4, 2, 1]),
      ...opMoveResultObj(2),
      ...opIgetObj(1, 5, F_BR_USB),
      ...opInvokeVirtual(M_USBMGR_REQ_PERM, [0, 1, 2]),
      ...opConstStr(0, S_PENDING_USB),
      ...opReturnObj(0),
      label('usb_perm_ok'),
      ...opConstStr(0, S_OK_USB),
      ...opReturnObj(0),
    ],
    catchItems: [...opMoveException(0), ...opConstStr(0, S_ERR_NO_USB), ...opReturnObj(0)],
  });

  // printUsbBase64(String)String: v9 = this, v10 = base64Data
  // Keeps UsbDeviceConnection (F_BR_USBCONN) and UsbEndpoint (F_BR_USBEP) open across 8KB raster chunks
  // so multi-chunk photo strips stream smoothly over USB OTG without resetting the bulk pipe!
  const codeBrPrtUsb = makeCodeItem(11, 2, 5, [], {
    tryItems: [
      ...opIgetObj(0, 9, F_BR_USBCONN),
      opIfEqz(0, 'usb_open_fresh'),
      ...opIgetObj(4, 9, F_BR_USBEP),
      opIfNez(4, 'usb_do_transfer'),
      label('usb_open_fresh'),
      ...opIgetObj(0, 9, F_BR_ACT),
      ...opConstStr(1, S_USB_SVC),
      ...opInvokeVirtual(M_ACT_GET_SYS, [0, 1]),
      ...opMoveResultObj(0),
      ...opCheckCast(0, T_USBMGR),
      ...opIgetObj(1, 9, F_BR_USB),
      opIfNez(1, 'usb_dev_ready'),
      ...opInvokeVirtual(M_USBMGR_DEVS, [0]),
      ...opMoveResultObj(1),
      ...opInvokeVirtual(M_HASHMAP_EMPTY, [1]),
      ...opMoveResult(2),
      opIfEqz(2, 'usb_pick_first'),
      ...opConstStr(2, S_ERR_NO_USB),
      ...opReturnObj(2),
      label('usb_pick_first'),
      ...opInvokeVirtual(M_HASHMAP_VALS, [1]),
      ...opMoveResultObj(1),
      ...opInvokeInterface(M_COLL_ITER, [1]),
      ...opMoveResultObj(1),
      ...opInvokeInterface(M_ITER_NEXT, [1]),
      ...opMoveResultObj(1),
      ...opCheckCast(1, T_USBDEV),
      ...opIputObj(1, 9, F_BR_USB),
      label('usb_dev_ready'),
      ...opInvokeVirtual(M_USBMGR_HAS_PERM, [0, 1]),
      ...opMoveResult(2),
      opIfNez(2, 'usb_scan_interfaces'),
      // Request permission automatically when user taps Print
      ...opNewInstance(2, T_INTENT),
      ...opConstStr(3, S_ACT_USB_PERM),
      ...opInvokeDirect(M_INTENT_INIT, [2, 3]),
      ...opSgetInt(3, F_SDK_INT),
      ...opConst16(4, 31),
      ...opConst4(5, 0),
      opIfLt(3, 4, 'prt_pintent_ready'),
      ...opConst32(5, 33554432),
      label('prt_pintent_ready'),
      ...opIgetObj(3, 9, F_BR_ACT),
      ...opConst4(4, 0),
      ...opInvokeStatic(M_PINTENT_BCAST, [3, 4, 2, 5]),
      ...opMoveResultObj(2),
      ...opInvokeVirtual(M_USBMGR_REQ_PERM, [0, 1, 2]),
      ...opConstStr(2, S_ERR_USB_PERM),
      ...opReturnObj(2),
      label('usb_scan_interfaces'),
      // Loop over all interfaces to find an endpoint with getDirection() == 0 (USB_DIR_OUT)
      ...opInvokeVirtual(M_USBDEV_INTF_CNT, [1]),
      ...opMoveResult(5), // v5 = intfCount
      ...opConst4(6, 0), // v6 = intfIdx
      label('intf_loop'),
      opIfGe(6, 5, 'no_out_ep'),
      ...opInvokeVirtual(M_USBDEV_GET_INTF, [1, 6]),
      ...opMoveResultObj(3), // v3 = UsbInterface
      ...opInvokeVirtual(M_USBINTF_EP_CNT, [3]),
      ...opMoveResult(7), // v7 = epCount
      ...opConst4(8, 0), // v8 = epIdx
      label('ep_loop'),
      opIfGe(8, 7, 'next_intf'),
      ...opInvokeVirtual(M_USBINTF_GET_EP, [3, 8]),
      ...opMoveResultObj(4), // v4 = UsbEndpoint
      ...opInvokeVirtual(M_USBEP_GET_DIR, [4]),
      ...opMoveResult(2), // v2 = direction (0 == USB_DIR_OUT)
      opIfEqz(2, 'found_out_ep'),
      ...opAddIntLit8(8, 8, 1),
      opGoto('ep_loop'),
      label('next_intf'),
      ...opAddIntLit8(6, 6, 1),
      opGoto('intf_loop'),
      label('no_out_ep'),
      ...opConstStr(0, S_ERR_USB_EP),
      ...opReturnObj(0),
      label('found_out_ep'),
      // v3 = matching UsbInterface, v4 = matching OUT UsbEndpoint
      ...opInvokeVirtual(M_USBMGR_OPEN, [0, 1]),
      ...opMoveResultObj(0),
      opIfNez(0, 'usb_conn_opened'),
      ...opConstStr(0, S_ERR_USB_EP),
      ...opReturnObj(0),
      label('usb_conn_opened'),
      ...opConst4(1, 1),
      ...opInvokeVirtual(M_USBCONN_CLAIM, [0, 3, 1]),
      ...opIputObj(0, 9, F_BR_USBCONN),
      ...opIputObj(4, 9, F_BR_USBEP),
      label('usb_do_transfer'),
      ...opConst4(2, 0),
      ...opInvokeStatic(M_B64_DEC, [10, 2]),
      ...opMoveResultObj(1),
      ...opArrayLength(2, 1),
      ...opConst16(3, 6000),
      ...opInvokeVirtual(M_USBCONN_BULK, [0, 4, 1, 2, 3]),
      ...opMoveResult(5),
      ...opConst4(6, 0),
      opIfLt(5, 6, 'usb_transfer_err'),
      ...opConstStr(0, S_OK),
      ...opReturnObj(0),
      label('usb_transfer_err'),
      ...opInvokeVirtual(M_USBCONN_CLOSE, [0]),
      ...opConst4(0, 0),
      ...opIputObj(0, 9, F_BR_USBCONN),
      ...opIputObj(0, 9, F_BR_USBEP),
      ...opConstStr(0, S_ERR_USB_EP),
      ...opReturnObj(0),
    ],
    catchItems: [
      ...opMoveException(0),
      ...opConst4(0, 0),
      ...opIputObj(0, 9, F_BR_USBCONN),
      ...opIputObj(0, 9, F_BR_USBEP),
      ...opConstStr(0, S_ERR_USB_EP),
      ...opReturnObj(0),
    ],
  });

  // connectBluetooth()String: v6 = this
  // Actively connects an RFCOMM BluetoothSocket in two passes across bonded devices:
  // Pass 1: IMAGING (1536) and UNCATEGORIZED (7936) thermal printers
  // Pass 2: Any other bonded device accepting SPP UUID 00001101-0000-1000-8000-00805F9B34FB
  const codeBrConnBt = makeCodeItem(7, 1, 2, [], {
    tryItems: [
      // Reuse already-open BluetoothSocket if still connected
      ...opIgetObj(0, 6, F_BR_BTSOCK),
      opIfEqz(0, 'bt_check_adapter'),
      ...opInvokeVirtual(M_BTSOCK_IS_CONN, [0]),
      ...opMoveResult(1),
      opIfEqz(1, 'bt_check_adapter'),
      ...opIgetObj(0, 6, F_BR_BT),
      opIfNez(0, 'bt_format_name'),
      label('bt_check_adapter'),
      ...opInvokeStatic(M_BT_DEFAULT, []),
      ...opMoveResultObj(0),
      opIfNez(0, 'bt_has_adapter'),
      ...opConstStr(1, S_ERR_NO_BT),
      ...opReturnObj(1),
      label('bt_has_adapter'),
      ...opInvokeVirtual(M_BT_ENABLED, [0]),
      ...opMoveResult(1),
      opIfNez(1, 'bt_is_enabled'),
      ...opNewInstance(1, T_INTENT),
      ...opConstStr(2, S_ACT_BT_EN),
      ...opInvokeDirect(M_INTENT_INIT, [1, 2]),
      ...opIgetObj(2, 6, F_BR_ACT),
      ...opInvokeVirtual(M_ACT_START_ACT, [2, 1]),
      ...opConstStr(1, S_ERR_BT_OFF),
      ...opReturnObj(1),
      label('bt_is_enabled'),
      ...opInvokeVirtual(M_BT_BONDED, [0]),
      ...opMoveResultObj(0),
      ...opInvokeInterface(M_SET_EMPTY, [0]),
      ...opMoveResult(1),
      opIfEqz(1, 'bt_has_bonded'),
      ...opNewInstance(1, T_INTENT),
      ...opConstStr(2, S_ACT_BT_SET),
      ...opInvokeDirect(M_INTENT_INIT, [1, 2]),
      ...opIgetObj(2, 6, F_BR_ACT),
      ...opInvokeVirtual(M_ACT_START_ACT, [2, 1]),
      ...opConstStr(1, S_FB_NO_BT),
      ...opReturnObj(1),
      label('bt_has_bonded'),
      // Pass 1: Try connecting RFCOMM socket to IMAGING (1536) or UNCATEGORIZED (7936) devices
      ...opInvokeInterface(M_SET_ITER, [0]),
      ...opMoveResultObj(1), // v1 = Iterator
      label('bt_pass1_loop'),
      ...opInvokeInterface(M_ITER_HAS_NEXT, [1]),
      ...opMoveResult(2),
      opIfEqz(2, 'bt_pass2_start'),
      ...opInvokeInterface(M_ITER_NEXT, [1]),
      ...opMoveResultObj(2),
      ...opCheckCast(2, T_BTDEV), // v2 = candidate BluetoothDevice
      ...opInvokeVirtual(M_BTDEV_GET_CLASS, [2]),
      ...opMoveResultObj(3),
      opIfEqz(3, 'bt_pass1_loop'),
      ...opInvokeVirtual(M_BTCLASS_MAJOR, [3]),
      ...opMoveResult(3),
      ...opConst16(4, 1536),
      opIfEq(3, 4, 'bt_pass1_try'),
      ...opConst16(4, 7936),
      opIfEq(3, 4, 'bt_pass1_try'),
      opGoto('bt_pass1_loop'),
      label('bt_pass1_try'),
      ...opIputObj(2, 6, F_BR_BT),
      ...opInvokeVirtual(M_BR_TRY_BT, [6, 2]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_connected_ok'),
      ...opInvokeVirtual(M_BR_TRY_BT_SEC, [6, 2]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_connected_ok'),
      opGoto('bt_pass1_loop'),
      // Pass 2: Try connecting RFCOMM socket to any bonded device
      label('bt_pass2_start'),
      ...opInvokeInterface(M_SET_ITER, [0]),
      ...opMoveResultObj(1), // v1 = Iterator
      label('bt_pass2_loop'),
      ...opInvokeInterface(M_ITER_HAS_NEXT, [1]),
      ...opMoveResult(2),
      opIfEqz(2, 'bt_no_live_sock'),
      ...opInvokeInterface(M_ITER_NEXT, [1]),
      ...opMoveResultObj(2),
      ...opCheckCast(2, T_BTDEV),
      ...opInvokeVirtual(M_BR_TRY_BT, [6, 2]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_connected_ok'),
      ...opInvokeVirtual(M_BR_TRY_BT_SEC, [6, 2]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_connected_ok'),
      opGoto('bt_pass2_loop'),
      label('bt_no_live_sock'),
      // If a paired IMAGING/UNCATEGORIZED printer was found in Pass 1, return its name
      ...opIgetObj(0, 6, F_BR_BT),
      opIfNez(0, 'bt_format_name'),
      // Otherwise no printer is paired yet -> launch Android Bluetooth Settings so user can pair VOZY G80
      ...opNewInstance(1, T_INTENT),
      ...opConstStr(2, S_ACT_BT_SET),
      ...opInvokeDirect(M_INTENT_INIT, [1, 2]),
      ...opIgetObj(2, 6, F_BR_ACT),
      ...opInvokeVirtual(M_ACT_START_ACT, [2, 1]),
      ...opConstStr(0, S_FB_NO_BT),
      ...opReturnObj(0),
      label('bt_connected_ok'),
      ...opIgetObj(0, 6, F_BR_BT),
      opIfNez(0, 'bt_format_name'),
      ...opConstStr(0, S_OK_BT),
      ...opReturnObj(0),
      label('bt_format_name'),
      ...opInvokeVirtual(M_BTDEV_GET_NAME, [0]),
      ...opMoveResultObj(1),
      opIfEqz(1, 'bt_default_name'),
      ...opConstStr(2, S_OK_PREFIX),
      ...opInvokeVirtual(M_STR_CONCAT, [2, 1]),
      ...opMoveResultObj(0),
      ...opReturnObj(0),
      label('bt_default_name'),
      ...opConstStr(0, S_OK_BT),
      ...opReturnObj(0),
    ],
    catchItems: [...opMoveException(0), ...opConstStr(0, S_FB_NO_BT), ...opReturnObj(0)],
  });

  // printBluetoothBase64(String)String: v5 = this, v6 = base64Data
  // Keeps the BluetoothSocket open across chunks in F_BR_BTSOCK so multi-chunk raster strips stream continuously
  // without dropping or resetting the printer between 8KB chunks. Uses tryConnectBtSocket & tryConnectSecureBtSocket.
  const codeBrPrtBt = makeCodeItem(7, 2, 2, [], {
    tryItems: [
      ...opConst4(1, 0),
      ...opInvokeStatic(M_B64_DEC, [6, 1]),
      ...opMoveResultObj(1), // v1 = byte[]
      // Check if we already have an active connected BluetoothSocket
      ...opIgetObj(2, 5, F_BR_BTSOCK),
      opIfEqz(2, 'bt_open_new_sock'),
      ...opInvokeVirtual(M_BTSOCK_IS_CONN, [2]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_write_stream'),
      label('bt_open_new_sock'),
      ...opIgetObj(0, 5, F_BR_BT),
      opIfNez(0, 'bt_dev_ready'),
      ...opInvokeVirtual(M_BR_CONN_BT, [5]),
      ...opIgetObj(2, 5, F_BR_BTSOCK),
      opIfEqz(2, 'bt_check_selected_dev'),
      ...opInvokeVirtual(M_BTSOCK_IS_CONN, [2]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_write_stream'),
      label('bt_check_selected_dev'),
      ...opIgetObj(0, 5, F_BR_BT),
      opIfNez(0, 'bt_dev_ready'),
      ...opConstStr(0, S_FB_NO_BT),
      ...opReturnObj(0),
      label('bt_dev_ready'),
      ...opInvokeVirtual(M_BR_TRY_BT, [5, 0]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_sock_ready'),
      ...opInvokeVirtual(M_BR_TRY_BT_SEC, [5, 0]),
      ...opMoveResult(3),
      opIfNez(3, 'bt_sock_ready'),
      ...opConstStr(0, S_ERR_GEN),
      ...opReturnObj(0),
      label('bt_sock_ready'),
      ...opIgetObj(2, 5, F_BR_BTSOCK),
      opIfNez(2, 'bt_write_stream'),
      ...opConstStr(0, S_ERR_GEN),
      ...opReturnObj(0),
      label('bt_write_stream'),
      ...opInvokeVirtual(M_BTSOCK_OUT, [2]),
      ...opMoveResultObj(3),
      ...opInvokeVirtual(M_OUT_WRITE, [3, 1]),
      ...opInvokeVirtual(M_OUT_FLUSH, [3]),
      ...opConstStr(0, S_OK),
      ...opReturnObj(0),
    ],
    catchItems: [
      ...opMoveException(0),
      // Reset cached socket on error so next attempt reconnects cleanly
      ...opConst4(1, 0),
      ...opIputObj(1, 5, F_BR_BTSOCK),
      ...opConstStr(0, S_ERR_GEN),
      ...opReturnObj(0),
    ],
  });

  // printTcpBase64(String, int, String)String: v4 = this, v5 = ip, v6 = port, v7 = base64Data
  const codeBrPrtTcp = makeCodeItem(8, 4, 3, [], {
    tryItems: [
      ...opConst4(0, 0),
      ...opInvokeStatic(M_B64_DEC, [7, 0]),
      ...opMoveResultObj(0),
      ...opNewInstance(1, T_SOCK),
      ...opInvokeDirect(M_SOCK_INIT, [1, 5, 6]),
      ...opInvokeVirtual(M_SOCK_OUT, [1]),
      ...opMoveResultObj(2),
      ...opInvokeVirtual(M_OUT_WRITE, [2, 0]),
      ...opInvokeVirtual(M_OUT_FLUSH, [2]),
      ...opInvokeVirtual(M_OUT_CLOSE, [2]),
      ...opInvokeVirtual(M_SOCK_CLOSE, [1]),
      ...opConstStr(0, S_OK),
      ...opReturnObj(0),
    ],
    catchItems: [...opMoveException(0), ...opConstStr(0, S_ERR_GEN), ...opReturnObj(0)],
  });

  // Assemble DEX sections with strict 4-byte alignment and MapList ordering
  const classList = [
    {
      cls: T_CHROME,
      superCls: T_WCC,
      instanceFields: [],
      directMethods: [{ mKey: M_CHROME_INIT, flags: 0x10001, code: codeChromeInit }],
      virtualMethods: [{ mKey: M_CHROME_ONPERM, flags: 0x0001, code: codeChromeOnPerm }],
      annotatedMethods: [],
    },
    {
      cls: T_BRIDGE,
      superCls: T_OBJ,
      instanceFields: [
        { fKey: F_BR_ACT, flags: 0x0002 },
        { fKey: F_BR_BT, flags: 0x0002 },
        { fKey: F_BR_BTSOCK, flags: 0x0002 },
        { fKey: F_BR_USB, flags: 0x0002 },
        { fKey: F_BR_USBCONN, flags: 0x0002 },
        { fKey: F_BR_USBEP, flags: 0x0002 },
      ],
      directMethods: [{ mKey: M_BR_INIT, flags: 0x10001, code: codeBrInit }],
      virtualMethods: [
        { mKey: M_BR_CONN_BT, flags: 0x0001, code: codeBrConnBt },
        { mKey: M_BR_CONN_USB, flags: 0x0001, code: codeBrConnUsb },
        { mKey: M_BR_GET_VER, flags: 0x0001, code: codeBrGetVer },
        { mKey: M_BR_HAS_USB, flags: 0x0001, code: codeBrHasUsb },
        { mKey: M_BR_OPEN_BT_SET, flags: 0x0001, code: codeBrOpenBtSet },
        { mKey: M_BR_PRT_BT, flags: 0x0001, code: codeBrPrtBt },
        { mKey: M_BR_PRT_TCP, flags: 0x0001, code: codeBrPrtTcp },
        { mKey: M_BR_PRT_USB, flags: 0x0001, code: codeBrPrtUsb },
        { mKey: M_BR_TRY_BT, flags: 0x0001, code: codeBrTryBt },
        { mKey: M_BR_TRY_BT_SEC, flags: 0x0001, code: codeBrTryBtSec },
      ],
      annotatedMethods: [
        M_BR_CONN_BT,
        M_BR_CONN_USB,
        M_BR_GET_VER,
        M_BR_HAS_USB,
        M_BR_OPEN_BT_SET,
        M_BR_PRT_BT,
        M_BR_PRT_TCP,
        M_BR_PRT_USB,
      ],
    },
    {
      cls: T_MAIN,
      superCls: T_ACT,
      instanceFields: [{ fKey: F_MAIN_WV, flags: 0x0002 }],
      directMethods: [{ mKey: M_MAIN_INIT, flags: 0x10001, code: codeMainInit }],
      virtualMethods: [
        { mKey: M_MAIN_HIDE_SYS_UI, flags: 0x0001, code: codeMainHideSysUi },
        { mKey: M_MAIN_ONBACK, flags: 0x0001, code: codeMainOnBack },
        { mKey: M_MAIN_ONCREATE, flags: 0x0004, code: codeMainOnCreate },
        { mKey: M_MAIN_ONRESUME, flags: 0x0004, code: codeMainOnResume },
        { mKey: M_MAIN_ONWIN_FOCUS, flags: 0x0001, code: codeMainOnWinFocus },
      ],
      annotatedMethods: [],
    },
  ];

  // Calculate fixed index tables layout
  const headerSize = 0x70; // 112
  const stringIdsOff = headerSize;
  const stringIdsSize = sortedStrings.length;
  const typeIdsOff = stringIdsOff + stringIdsSize * 4;
  const typeIdsSize = sortedTypes.length;
  const protoIdsOff = typeIdsOff + typeIdsSize * 4;
  const protoIdsSize = sortedProtos.length;
  const fieldIdsOff = protoIdsOff + protoIdsSize * 12;
  const fieldIdsSize = sortedFields.length;
  const methodIdsOff = fieldIdsOff + fieldIdsSize * 8;
  const methodIdsSize = sortedMethods.length;
  const classDefsOff = methodIdsOff + methodIdsSize * 8;
  const classDefsSize = classList.length;
  const dataOff = classDefsOff + classDefsSize * 32;

  let curDataOff = dataOff;
  const dataChunks = [];
  const mapEntries = [
    { type: 0x0000, size: 1, offset: 0 },
    { type: 0x0001, size: stringIdsSize, offset: stringIdsOff },
    { type: 0x0002, size: typeIdsSize, offset: typeIdsOff },
    { type: 0x0003, size: protoIdsSize, offset: protoIdsOff },
    { type: 0x0004, size: fieldIdsSize, offset: fieldIdsOff },
    { type: 0x0005, size: methodIdsSize, offset: methodIdsOff },
    { type: 0x0006, size: classDefsSize, offset: classDefsOff },
  ];

  function align4() {
    const pad = (4 - (curDataOff % 4)) % 4;
    if (pad > 0) {
      dataChunks.push(Buffer.alloc(pad, 0));
      curDataOff += pad;
    }
  }

  function pushData(buf) {
    dataChunks.push(buf);
    const off = curDataOff;
    curDataOff += buf.length;
    return off;
  }

  // 1. TYPE_TYPE_LIST (0x1001) for proto parameters
  align4();
  const typeListStartOff = curDataOff;
  let typeListCount = 0;
  const protoParamOffs = new Map();
  for (const p of sortedProtos) {
    if (p.paramTypes.length === 0) {
      protoParamOffs.set(p.key, 0);
    } else {
      align4();
      const b = Buffer.alloc(4 + p.paramTypes.length * 2);
      b.writeUInt32LE(p.paramTypes.length, 0);
      p.paramTypes.forEach((pt, idx) => b.writeUInt16LE(typeIdx.get(pt), 4 + idx * 2));
      protoParamOffs.set(p.key, pushData(b));
      typeListCount++;
    }
  }
  if (typeListCount > 0) {
    mapEntries.push({ type: 0x1001, size: typeListCount, offset: typeListStartOff });
  }

  // 2. TYPE_ANNOTATION_ITEM (0x2004) for @JavascriptInterface
  const annotItemOff = pushData(
    Buffer.concat([
      Buffer.from([0x01]), // VISIBILITY_RUNTIME
      writeUleb128(typeIdx.get(T_JSINT)),
      writeUleb128(0), // 0 elements
    ])
  );
  mapEntries.push({ type: 0x2004, size: 1, offset: annotItemOff });

  // 3. TYPE_ANNOTATION_SET_ITEM (0x1003)
  align4();
  const annotSetBuf = Buffer.alloc(8);
  annotSetBuf.writeUInt32LE(1, 0);
  annotSetBuf.writeUInt32LE(annotItemOff, 4);
  const annotSetOff = pushData(annotSetBuf);
  mapEntries.push({ type: 0x1003, size: 1, offset: annotSetOff });

  // 4. TYPE_ANNOTATIONS_DIRECTORY_ITEM (0x2006)
  align4();
  const annotDirStartOff = curDataOff;
  let annotDirCount = 0;
  const classAnnotOffs = new Map();
  for (const c of classList) {
    if (c.annotatedMethods.length === 0) {
      classAnnotOffs.set(c.cls, 0);
    } else {
      align4();
      const sortedM = [...c.annotatedMethods].sort((a, b) => methodIdx.get(a) - methodIdx.get(b));
      const b = Buffer.alloc(16 + sortedM.length * 8);
      b.writeUInt32LE(0, 0); // class_annotations_off
      b.writeUInt32LE(0, 4); // fields_size
      b.writeUInt32LE(sortedM.length, 8); // annotated_methods_size
      b.writeUInt32LE(0, 12); // annotated_parameters_size
      sortedM.forEach((mk, idx) => {
        b.writeUInt32LE(methodIdx.get(mk), 16 + idx * 8);
        b.writeUInt32LE(annotSetOff, 20 + idx * 8);
      });
      classAnnotOffs.set(c.cls, pushData(b));
      annotDirCount++;
    }
  }
  if (annotDirCount > 0) {
    mapEntries.push({ type: 0x2006, size: annotDirCount, offset: annotDirStartOff });
  }

  // 5. TYPE_CODE_ITEM (0x2001)
  align4();
  const codeStartOff = curDataOff;
  let codeCount = 0;
  const methodCodeOffs = new Map();
  for (const c of classList) {
    for (const m of [...c.directMethods, ...c.virtualMethods]) {
      align4();
      methodCodeOffs.set(m.mKey, pushData(m.code));
      codeCount++;
    }
  }
  mapEntries.push({ type: 0x2001, size: codeCount, offset: codeStartOff });

  // 6. TYPE_STRING_DATA_ITEM (0x2002)
  const stringDataStartOff = curDataOff;
  const stringDataOffs = [];
  for (const s of sortedStrings) {
    const utf8 = Buffer.from(s, 'utf8');
    const b = Buffer.concat([writeUleb128(s.length), utf8, Buffer.from([0x00])]);
    stringDataOffs.push(pushData(b));
  }
  mapEntries.push({ type: 0x2002, size: sortedStrings.length, offset: stringDataStartOff });

  // 7. TYPE_CLASS_DATA_ITEM (0x2000)
  const classDataStartOff = curDataOff;
  const classDataOffs = new Map();
  for (const c of classList) {
    const sortedIF = [...c.instanceFields].sort((a, b) => fieldIdx.get(a.fKey) - fieldIdx.get(b.fKey));
    const sortedDM = [...c.directMethods].sort((a, b) => methodIdx.get(a.mKey) - methodIdx.get(b.mKey));
    const sortedVM = [...c.virtualMethods].sort((a, b) => methodIdx.get(a.mKey) - methodIdx.get(b.mKey));

    const parts = [
      writeUleb128(0), // static_fields_size
      writeUleb128(sortedIF.length), // instance_fields_size
      writeUleb128(sortedDM.length), // direct_methods_size
      writeUleb128(sortedVM.length), // virtual_methods_size
    ];

    let prevF = 0;
    for (const f of sortedIF) {
      const idx = fieldIdx.get(f.fKey);
      parts.push(writeUleb128(idx - prevF), writeUleb128(f.flags));
      prevF = idx;
    }

    let prevM = 0;
    for (const m of sortedDM) {
      const idx = methodIdx.get(m.mKey);
      parts.push(writeUleb128(idx - prevM), writeUleb128(m.flags), writeUleb128(methodCodeOffs.get(m.mKey)));
      prevM = idx;
    }

    prevM = 0;
    for (const m of sortedVM) {
      const idx = methodIdx.get(m.mKey);
      parts.push(writeUleb128(idx - prevM), writeUleb128(m.flags), writeUleb128(methodCodeOffs.get(m.mKey)));
      prevM = idx;
    }

    classDataOffs.set(c.cls, pushData(Buffer.concat(parts)));
  }
  mapEntries.push({ type: 0x2000, size: classList.length, offset: classDataStartOff });

  // 8. TYPE_MAP_LIST (0x1000)
  align4();
  const mapOff = curDataOff;
  mapEntries.push({ type: 0x1000, size: 1, offset: mapOff });
  const mapBuf = Buffer.alloc(4 + mapEntries.length * 12);
  mapBuf.writeUInt32LE(mapEntries.length, 0);
  mapEntries.forEach((me, idx) => {
    const off = 4 + idx * 12;
    mapBuf.writeUInt16LE(me.type, off);
    mapBuf.writeUInt16LE(0, off + 2);
    mapBuf.writeUInt32LE(me.size, off + 4);
    mapBuf.writeUInt32LE(me.offset, off + 8);
  });
  pushData(mapBuf);

  const fileSize = curDataOff;
  const dataSize = fileSize - dataOff;

  // Build fixed tables buffer
  const fixedBuf = Buffer.alloc(dataOff, 0);
  // Magic: "dex\n035\0"
  Buffer.from('6465780a30333500', 'hex').copy(fixedBuf, 0);
  fixedBuf.writeUInt32LE(fileSize, 32);
  fixedBuf.writeUInt32LE(headerSize, 36);
  fixedBuf.writeUInt32LE(0x12345678, 40); // endian_tag
  fixedBuf.writeUInt32LE(0, 44); // link_size
  fixedBuf.writeUInt32LE(0, 48); // link_off
  fixedBuf.writeUInt32LE(mapOff, 52);
  fixedBuf.writeUInt32LE(stringIdsSize, 56);
  fixedBuf.writeUInt32LE(stringIdsOff, 60);
  fixedBuf.writeUInt32LE(typeIdsSize, 64);
  fixedBuf.writeUInt32LE(typeIdsOff, 68);
  fixedBuf.writeUInt32LE(protoIdsSize, 72);
  fixedBuf.writeUInt32LE(protoIdsOff, 76);
  fixedBuf.writeUInt32LE(fieldIdsSize, 80);
  fixedBuf.writeUInt32LE(fieldIdsOff, 84);
  fixedBuf.writeUInt32LE(methodIdsSize, 88);
  fixedBuf.writeUInt32LE(methodIdsOff, 92);
  fixedBuf.writeUInt32LE(classDefsSize, 96);
  fixedBuf.writeUInt32LE(classDefsOff, 100);
  fixedBuf.writeUInt32LE(dataSize, 104);
  fixedBuf.writeUInt32LE(dataOff, 108);

  // Fill string_ids
  stringDataOffs.forEach((off, i) => fixedBuf.writeUInt32LE(off, stringIdsOff + i * 4));
  // Fill type_ids
  sortedTypes.forEach((t, i) => fixedBuf.writeUInt32LE(strIdx.get(t), typeIdsOff + i * 4));
  // Fill proto_ids
  sortedProtos.forEach((p, i) => {
    const off = protoIdsOff + i * 12;
    fixedBuf.writeUInt32LE(strIdx.get(p.shorty), off);
    fixedBuf.writeUInt32LE(typeIdx.get(p.retType), off + 4);
    fixedBuf.writeUInt32LE(protoParamOffs.get(p.key), off + 8);
  });
  // Fill field_ids
  sortedFields.forEach((f, i) => {
    const off = fieldIdsOff + i * 8;
    fixedBuf.writeUInt16LE(typeIdx.get(f.cls), off);
    fixedBuf.writeUInt16LE(typeIdx.get(f.type), off + 2);
    fixedBuf.writeUInt32LE(strIdx.get(f.name), off + 4);
  });
  // Fill method_ids
  sortedMethods.forEach((m, i) => {
    const off = methodIdsOff + i * 8;
    fixedBuf.writeUInt16LE(typeIdx.get(m.cls), off);
    fixedBuf.writeUInt16LE(protoIdx.get(m.protoKey), off + 2);
    fixedBuf.writeUInt32LE(strIdx.get(m.name), off + 4);
  });
  // Fill class_defs
  classList.forEach((c, i) => {
    const off = classDefsOff + i * 32;
    fixedBuf.writeUInt32LE(typeIdx.get(c.cls), off);
    fixedBuf.writeUInt32LE(0x0001, off + 4); // ACC_PUBLIC
    fixedBuf.writeUInt32LE(typeIdx.get(c.superCls), off + 8);
    fixedBuf.writeUInt32LE(0, off + 12); // interfaces_off
    fixedBuf.writeUInt32LE(0xffffffff, off + 16); // source_file_idx = NO_INDEX
    fixedBuf.writeUInt32LE(classAnnotOffs.get(c.cls), off + 20);
    fixedBuf.writeUInt32LE(classDataOffs.get(c.cls), off + 24);
    fixedBuf.writeUInt32LE(0, off + 28); // static_values_off
  });

  const fullDex = Buffer.concat([fixedBuf, ...dataChunks]);

  // Compute SHA-1 signature of bytes [32..fileSize)
  const sha1 = crypto.createHash('sha1').update(fullDex.subarray(32)).digest();
  sha1.copy(fullDex, 12);

  // Compute Adler32 checksum of bytes [12..fileSize)
  const checksum = adler32(fullDex.subarray(12));
  fullDex.writeUInt32LE(checksum, 8);

  return fullDex;
}

// ============================================================================
// 4. PERSISTENT SIGNING KEY & DUAL V1 (JAR) + V2 (APK SIG BLOCK 42) SIGNER
// ============================================================================

function ensurePersistentKeypair() {
  fs.mkdirSync(keyDir, { recursive: true });
  const keyPemPath = path.join(keyDir, 'jcv-release-key.pem');
  const certPemPath = path.join(keyDir, 'jcv-release-cert.pem');
  const certDerPath = path.join(keyDir, 'jcv-release-cert.der');

  if (!fs.existsSync(keyPemPath) || !fs.existsSync(certPemPath) || !fs.existsSync(certDerPath)) {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPemPath}" -out "${certPemPath}" -days 10000 -subj "/CN=JCVcreatives/OU=Studio/O=JCVcreatives/L=Manila/ST=MetroManila/C=PH"`,
      { stdio: 'ignore' }
    );
    execSync(`openssl x509 -in "${certPemPath}" -outform DER -out "${certDerPath}"`, { stdio: 'ignore' });
  }

  return {
    keyPemPath,
    certPemPath,
    keyPem: fs.readFileSync(keyPemPath, 'utf8'),
    certDer: fs.readFileSync(certDerPath),
  };
}

function buildV1ManifestFiles(entries, keyInfo) {
  // entries: [{ name: string, rawData: Buffer, storeUncompressed: boolean }]
  const manifestLines = [
    'Manifest-Version: 1.0',
    'Built-By: JCVcreatives',
    'Created-By: Android Gradle 8.2.0',
    '',
  ];

  const sfEntryBlocks = [];

  for (const entry of entries) {
    const sha256B64 = crypto.createHash('sha256').update(entry.rawData).digest('base64');
    const individualSection = `Name: ${entry.name}\r\nSHA-256-Digest: ${sha256B64}\r\n\r\n`;
    manifestLines.push(`Name: ${entry.name}`, `SHA-256-Digest: ${sha256B64}`, '');

    const sectionDigest = crypto.createHash('sha256').update(Buffer.from(individualSection, 'utf8')).digest('base64');
    sfEntryBlocks.push(`Name: ${entry.name}\r\nSHA-256-Digest: ${sectionDigest}\r\n\r\n`);
  }

  const manifestMfBuf = Buffer.from(manifestLines.join('\r\n'), 'utf8');
  const fullManifestDigest = crypto.createHash('sha256').update(manifestMfBuf).digest('base64');

  const certSfHeader = [
    'Signature-Version: 1.0',
    'Created-By: 1.0 (Android)',
    `SHA-256-Digest-Manifest: ${fullManifestDigest}`,
    'X-Android-APK-Signed: 2',
    '',
    '',
  ].join('\r\n');

  const certSfBuf = Buffer.from(certSfHeader + sfEntryBlocks.join(''), 'utf8');

  // Generate PKCS#7 detached signature (META-INF/CERT.RSA) via openssl cms
  fs.mkdirSync(workDir, { recursive: true });
  const sfTmp = path.join(workDir, 'CERT.SF');
  const rsaTmp = path.join(workDir, 'CERT.RSA');
  fs.writeFileSync(sfTmp, certSfBuf);
  execSync(
    `openssl cms -sign -binary -noattr -in "${sfTmp}" -signer "${keyInfo.certPemPath}" -inkey "${keyInfo.keyPemPath}" -outform DER -out "${rsaTmp}" -md sha256`,
    { stdio: 'ignore' }
  );
  const certRsaBuf = fs.readFileSync(rsaTmp);

  return [
    { name: 'META-INF/MANIFEST.MF', rawData: manifestMfBuf, storeUncompressed: false },
    { name: 'META-INF/CERT.SF', rawData: certSfBuf, storeUncompressed: false },
    { name: 'META-INF/CERT.RSA', rawData: certRsaBuf, storeUncompressed: false },
  ];
}

// CRC-32 Lookup Table for ZIP builder
const CRC32_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function lenPrefixed(buf) {
  const b = Buffer.alloc(4 + buf.length);
  b.writeUInt32LE(buf.length, 0);
  buf.copy(b, 4);
  return b;
}

function computeApkV2SigningBlock(zipEntriesBuf, centralDirBuf, eocdBuf, keyInfo) {
  const CHUNK_SIZE = 1024 * 1024; // 1 MB
  const chunkDigests = [];

  for (const section of [zipEntriesBuf, centralDirBuf, eocdBuf]) {
    let offset = 0;
    while (offset < section.length) {
      const slice = section.subarray(offset, Math.min(offset + CHUNK_SIZE, section.length));
      const prefix = Buffer.alloc(5);
      prefix.writeUInt8(0xa5, 0);
      prefix.writeUInt32LE(slice.length, 1);
      const digest = crypto.createHash('sha256').update(prefix).update(slice).digest();
      chunkDigests.push(digest);
      offset += slice.length;
    }
  }

  const topPrefix = Buffer.alloc(5);
  topPrefix.writeUInt8(0x5a, 0);
  topPrefix.writeUInt32LE(chunkDigests.length, 1);
  const topLevelDigest = crypto
    .createHash('sha256')
    .update(topPrefix)
    .update(Buffer.concat(chunkDigests))
    .digest();

  // Signature algorithm 0x0103 = RSASSA-PKCS1-v1_5 with SHA2-256
  const SIG_ALGO_RSA_PKCS1_V15_SHA256 = 0x0103;

  const algoBuf = Buffer.alloc(4);
  algoBuf.writeUInt32LE(SIG_ALGO_RSA_PKCS1_V15_SHA256, 0);

  const digestEntry = lenPrefixed(Buffer.concat([algoBuf, lenPrefixed(topLevelDigest)]));
  const digestsSeq = lenPrefixed(digestEntry);
  const certsSeq = lenPrefixed(lenPrefixed(keyInfo.certDer));
  const additionalAttrs = Buffer.alloc(4, 0); // empty sequence
  const signedData = Buffer.concat([digestsSeq, certsSeq, additionalAttrs]);

  // Sign signedData with RSA-SHA256
  const signatureBytes = crypto.sign('sha256', signedData, keyInfo.keyPem);
  const sigEntry = lenPrefixed(Buffer.concat([algoBuf, lenPrefixed(signatureBytes)]));
  const signaturesSeq = lenPrefixed(sigEntry);

  const pubKeyDer = crypto.createPublicKey(keyInfo.keyPem).export({ type: 'spki', format: 'der' });

  const signer = Buffer.concat([
    lenPrefixed(signedData),
    signaturesSeq,
    lenPrefixed(pubKeyDer),
  ]);
  const signersSeq = lenPrefixed(lenPrefixed(signer));

  // ID-value pair for APK_SIGNATURE_SCHEME_V2_BLOCK_ID (0x7109871a)
  const v2IdBuf = Buffer.alloc(4);
  v2IdBuf.writeUInt32LE(0x7109871a, 0);
  const pairPayload = Buffer.concat([v2IdBuf, signersSeq]);

  // APK Signing Block requires total size to be a multiple of 8 bytes (and 4096-byte page aligned if desired)
  const pairBuf = Buffer.alloc(8 + pairPayload.length);
  pairBuf.writeBigUInt64LE(BigInt(pairPayload.length), 0);
  pairPayload.copy(pairBuf, 8);

  const blockSizeField = BigInt(pairBuf.length + 8 + 16);
  const headSizeBuf = Buffer.alloc(8);
  headSizeBuf.writeBigUInt64LE(blockSizeField, 0);
  const tailSizeBuf = Buffer.alloc(8);
  tailSizeBuf.writeBigUInt64LE(blockSizeField, 0);
  const magicBuf = Buffer.from('APK Sig Block 42', 'ascii');

  return Buffer.concat([headSizeBuf, pairBuf, tailSizeBuf, magicBuf]);
}

function buildAlignedSignedApk(allEntries, keyInfo) {
  const localChunks = [];
  const centralChunks = [];
  let currentOffset = 0;

  for (const entry of allEntries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressedSize = entry.rawData.length;
    const crc = crc32(entry.rawData);

    let method = 8; // DEFLATE
    let payload = null;
    if (entry.storeUncompressed) {
      method = 0; // STORE
      payload = entry.rawData;
    } else {
      payload = zlib.deflateRawSync(entry.rawData, { level: 6 });
      if (payload.length >= uncompressedSize) {
        method = 0;
        payload = entry.rawData;
      }
    }

    // zipalign: if method === 0 (STORE), align data start (currentOffset + 30 + nameBuf.length + extraLen) to 4-byte boundary
    let extraLen = 0;
    if (method === 0) {
      const dataStart = currentOffset + 30 + nameBuf.length;
      extraLen = (4 - (dataStart % 4)) % 4;
    }

    const localHeader = Buffer.alloc(30 + nameBuf.length + extraLen);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0x0021, 10); // Last mod file time
    localHeader.writeUInt16LE(0x5221, 12); // Last mod file date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(extraLen, 28);
    nameBuf.copy(localHeader, 30);

    const localEntryOffset = currentOffset;
    localChunks.push(localHeader, payload);
    currentOffset += localHeader.length + payload.length;

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory file header signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0, 8); // Flags
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0x0021, 12);
    centralHeader.writeUInt16LE(0x5221, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(localEntryOffset, 42);
    nameBuf.copy(centralHeader, 46);
    centralChunks.push(centralHeader);
  }

  // Pad zipEntriesBuf to a 4-byte boundary if needed before APK Signing Block
  const zipEntriesBuf = Buffer.concat(localChunks);
  const centralDirBuf = Buffer.concat(centralChunks);
  const centralDirOffset = zipEntriesBuf.length;

  const eocdBuf = Buffer.alloc(22);
  eocdBuf.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocdBuf.writeUInt16LE(0, 4); // Number of this disk
  eocdBuf.writeUInt16LE(0, 6); // Disk where central directory starts
  eocdBuf.writeUInt16LE(allEntries.length, 8);
  eocdBuf.writeUInt16LE(allEntries.length, 10);
  eocdBuf.writeUInt32LE(centralDirBuf.length, 12);
  eocdBuf.writeUInt32LE(centralDirOffset, 16);
  eocdBuf.writeUInt16LE(0, 20); // Comment length

  // Compute APK Signature Scheme v2 Signing Block
  const apkV2Block = computeApkV2SigningBlock(zipEntriesBuf, centralDirBuf, eocdBuf, keyInfo);

  // Update EOCD Central Directory offset to account for inserted APK Signing Block
  const finalEocdBuf = Buffer.from(eocdBuf);
  finalEocdBuf.writeUInt32LE(centralDirOffset + apkV2Block.length, 16);

  return Buffer.concat([zipEntriesBuf, apkV2Block, centralDirBuf, finalEocdBuf]);
}

function collectWebAssets(dir, prefix = 'assets/www') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const item of fs.readdirSync(dir)) {
    if (isUnusedChatAttachment(item) || item === 'downloads' || item.toLowerCase().endsWith('.apk')) continue;
    const fullPath = path.join(dir, item);
    const relPath = `${prefix}/${item}`;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectWebAssets(fullPath, relPath));
    } else {
      const ext = path.extname(item).toLowerCase();
      // Store web assets uncompressed so Android WebView directly memory-maps (mmap) HTML/JS/CSS on cold launch with zero inflate delay
      const storeUncompressed = ['.html', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.woff2'].includes(ext);
      results.push({
        name: relPath,
        rawData: fs.readFileSync(fullPath),
        storeUncompressed,
      });
    }
  }
  return results;
}

async function buildApk() {
  cleanUnusedAttachmentsFromDist(path.join(distDir, 'assets', 'aistudio'));

  console.log('Building signed Android APK (v1 JAR + v2 APK Signature Scheme)...');
  const keyInfo = ensurePersistentKeypair();

  const manifestBin = buildBinaryAndroidManifest();
  const resourcesArsc = buildResourcesArsc();
  const classesDex = buildClassesDex();
  const iconPng = fs.readFileSync(path.join(publicDir, 'pwa-192x192.png'));

  const coreEntries = [
    { name: 'AndroidManifest.xml', rawData: manifestBin, storeUncompressed: false },
    // Android 11+ (targetSdkVersion >= 30) REQUIRES resources.arsc to be stored UNCOMPRESSED and 4-byte aligned!
    { name: 'resources.arsc', rawData: resourcesArsc, storeUncompressed: true },
    { name: 'res/drawable/ic_launcher.png', rawData: iconPng, storeUncompressed: true },
    // Store classes.dex uncompressed and 4-byte aligned so Android ART directly mmaps DEX without extraction delay on cold start
    { name: 'classes.dex', rawData: classesDex, storeUncompressed: true },
    ...collectWebAssets(distDir, 'assets/www'),
  ];

  const metaInfEntries = buildV1ManifestFiles(coreEntries, keyInfo);
  const allEntries = [...coreEntries, ...metaInfEntries];

  const finalApkBuf = buildAlignedSignedApk(allEntries, keyInfo);

  // Write to dist/, dist/downloads/, public/, and public/downloads/ so BOTH dev and production serve the real signed binary APK
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'downloads'), { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'downloads'), { recursive: true });

  const targets = [
    path.join(distDir, 'JCVcreatives-Photobooth.apk'),
    path.join(distDir, 'JCVcreatives-Photobooth-v3.0.apk'),
    path.join(distDir, 'downloads', 'JCVcreatives-Photobooth.apk'),
    path.join(distDir, 'downloads', 'JCVcreatives-Photobooth-v3.0.apk'),
    path.join(publicDir, 'JCVcreatives-Photobooth.apk'),
    path.join(publicDir, 'JCVcreatives-Photobooth-v3.0.apk'),
    path.join(publicDir, 'downloads', 'JCVcreatives-Photobooth.apk'),
    path.join(publicDir, 'downloads', 'JCVcreatives-Photobooth-v3.0.apk'),
  ];

  for (const t of targets) {
    fs.writeFileSync(t, finalApkBuf);
  }

  fs.rmSync(workDir, { recursive: true, force: true });
  console.log(
    `Successfully built & v1+v2 signed JCVcreatives-Photobooth-v3.0.apk (${(finalApkBuf.length / 1024).toFixed(1)} KB)`
  );
}

buildApk().catch((err) => {
  console.error('APK build error:', err);
  process.exit(1);
});
