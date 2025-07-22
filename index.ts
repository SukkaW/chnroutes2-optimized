import { TextLineStream } from 'foxts/text-line-stream';
import { invariant, nullthrow } from 'foxts/guard';
import { appendArrayInPlace } from 'foxts/append-array-in-place';
import { exclude as excludeCidr, contains as containsCidr, merge as mergeCidrs } from 'fast-cidr-tools';
import path from 'node:path';
import fs from 'node:fs';
import { createCompareSource, fileEqualWithCommentComparator } from 'foxts/compare-source';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import readline from 'node:readline';

const PUBLIC_DIR = path.join(__dirname, 'public');

function withPadding(title: string, contents: string[]) {
  const results = [
    '#########################################',
    '# Sukka\'s Optimized CHNRoutes - ' + title,
    '# Last Updated: ' + new Date().toISOString(),
    '# Size: ' + contents.length,
    '# License: CC BY-SA 2.0 + MIT',
    '# Homepage: https://github.com/SukkaW/chnroutes2-optimized',
    '# GitHub: https://github.com/SukkaW/chnroutes2-optimized',
    '# Source Data from https://misaka.io (misakaio @ GitHub)',
    '#########################################'
  ];
  appendArrayInPlace(results, contents);
  results.push('################## EOF ##################', '');

  return results;
}

// https://en.wikipedia.org/wiki/Reserved_IP_addresses
const RESERVED_IPV4_CIDR = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  // 192.88.99.0 // is currently being broadcast by HE and Comcast
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '233.252.0.0/24',
  '240.0.0.0/4'
];

const NON_CN_CIDR_INCLUDED_IN_CHNROUTE = [
  // China Mobile International HK
  // https://github.com/misakaio/chnroutes2/issues/25
  '223.118.0.0/15',
  '223.120.0.0/15',
  // Cloudie.hk
  // https://github.com/misakaio/chnroutes2/issues/50
  '123.254.104.0/21',
  // xTom
  // https://github.com/misakaio/chnroutes2/issues/49
  '45.147.48.0/23',
  '45.80.188.0/24',
  '45.80.190.0/24',
  // https://github.com/misakaio/chnroutes2/issues/52
  '137.220.128.0/17',

  // Cloudie.hk
  '103.246.246.0/23',

  '45.199.166.0/24',
  '45.199.167.0/24'
];

// https://github.com/misakaio/chnroutes2/issues/46
// https://github.com/misakaio/chnroutes2/issues/48
const CN_CIDR_MISSING_IN_CHNROUTE = [
  // ChinaTelecom
  '103.7.141.0/24', // Hubei

  // Aliyun Shenzhen
  '120.78.0.0/16',

  // wy.com.cn
  '211.99.96.0/19',

  // AS58593, Azure China
  '40.72.0.0/15', // Shanghai
  '42.159.0.0/16', // Shanghai
  '52.130.0.0/17', // Shanghai
  '52.131.0.0/16', // Beijing
  '103.9.8.0/22', // Backbone
  '139.217.0.0/16', // Shanghai
  '139.219.0.0/16', // Shanghai
  '143.64.0.0/16', // Beijing
  '159.27.0.0/16', // Beijing
  '163.228.0.0/16', // Beijing

  // NetEase
  '223.252.194.0/24',
  '223.252.196.0/24',

  // Xiamen Kuaikuai
  '180.188.36.0/22', // no route globally

  // Aofei
  '121.46.20.0/22', // PcCW & NTT at global

  // Baidu Public DNS
  '180.76.76.0/24',
  // Ali Public DNS
  '223.5.5.0/24',
  '223.6.6.0/24',
  // Tencent DNSPod Public DNS
  '119.29.29.0/24',
  '119.28.28.0/24',
  '120.53.53.0/24',
  '1.12.12.0/24',
  '1.12.34.0/24',
  // ByteDance Public DNS
  '180.184.1.0/24',
  '180.184.2.0/24',
  // 360 Public DNS
  '101.198.198.0/24',
  '101.198.199.0/24'
];

const PROBE_CHN_CIDR_V4 = [
  // NetEase Hangzhou
  '223.252.196.38',
  // Aliyun ShenZhen
  '120.78.92.171'
];

(async () => {
  const rawCidrs: string[] = [];

  for await (
    let line of nullthrow((await fetch('https://raw.githubusercontent.com/misakaio/chnroutes2/master/chnroutes.txt')).body)
      .pipeThrough(new TextDecoderStream(undefined, { fatal: true }))
      .pipeThrough(new TextLineStream({ skipEmptyLines: true }))
  ) {
    if (line.charCodeAt(0) === 35 /** # */) continue;
    line = line.trim();
    if (line.length === 0) continue;
    rawCidrs.push(line);
  }

  const chnCidrs = excludeCidr(
    appendArrayInPlace(rawCidrs, CN_CIDR_MISSING_IN_CHNROUTE),
    NON_CN_CIDR_INCLUDED_IN_CHNROUTE,
    true
  );

  for (const probeIp of PROBE_CHN_CIDR_V4) {
    if (!containsCidr(chnCidrs, PROBE_CHN_CIDR_V4)) {
      const err = new TypeError('chnroutes missing probe IP');
      err.cause = probeIp;
      throw err;
    }
  }

  const reversedChnCidrs = mergeCidrs(
    appendArrayInPlace(
      excludeCidr(
        ['0.0.0.0/0'],
        RESERVED_IPV4_CIDR.concat(chnCidrs),
        true
      ),
      // https://github.com/misakaio/chnroutes2/issues/25
      NON_CN_CIDR_INCLUDED_IN_CHNROUTE
    ),
    true
  );

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });


  await compareAndWriteFile(
    withPadding('China IPv4 CIDRs', chnCidrs),
    'https://chnroutes2.cdn.skk.moe/chnroutes.txt',
    path.join(PUBLIC_DIR, 'chnroutes.txt'),
  );
  await compareAndWriteFile(
    withPadding('Reversed China IPv4 CIDRs', reversedChnCidrs),
    'https://chnroutes2.cdn.skk.moe/reversed-chnroutes.txt',
    path.join(PUBLIC_DIR, 'reversed-chnroutes.txt'),
  )
})();

const fileEqual = createCompareSource(fileEqualWithCommentComparator);
async function compareAndWriteFile(source: string[], targetUrl: string, filePath: string) {
  const resp = await fetch(targetUrl);

  if (!(await fileEqual(
    source,
    nullthrow(resp.clone().body).pipeThrough(new TextDecoderStream(undefined, { fatal: true })).pipeThrough(new TextLineStream({ skipEmptyLines: true })),
  ))) {
    console.log(`Writing file: ${filePath}`);
    fs.writeFileSync(
      filePath,
      source.join('\n').trim() + '\n',
      { encoding: 'utf-8' }
    );
  } else {
    console.log('Use previous file:', filePath);
    await pipeline(
      nullthrow(resp.clone().body),
      fs.createWriteStream(filePath, 'utf-8')
    );
  }
}
