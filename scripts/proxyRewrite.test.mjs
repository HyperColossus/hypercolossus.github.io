import test from 'node:test';
import assert from 'node:assert/strict';
import { toProxy, fromProxyPath, rewriteUrl, rewriteSrcset, rewriteCss, rewriteRefresh, isPrivateHost } from '../proxy/src/rewrite.js';

const page = 'https://example.com/docs/intro.html';

test('proxied paths round-trip, and squashed slashes are repaired', () => {
  assert.equal(toProxy('https://example.com/a?b=1'), '/p/https://example.com/a?b=1');
  assert.equal(toProxy('mailto:x@y.z'), 'mailto:x@y.z');
  assert.equal(fromProxyPath('/p/https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(fromProxyPath('/p/https:/example.com/a'), 'https://example.com/a');
  assert.equal(fromProxyPath('/p/http://example.com'), 'http://example.com/');
  assert.equal(fromProxyPath('/assets/app.js'), null);
  assert.equal(fromProxyPath('/p/javascript:alert(1)'), null);
  assert.equal(fromProxyPath('/p/https://'), null);
});

test('attribute URLs are made absolute and proxied; special schemes are left alone', () => {
  assert.equal(rewriteUrl('/img/a.png', page), '/p/https://example.com/img/a.png');
  assert.equal(rewriteUrl('../b.html', page), '/p/https://example.com/b.html');
  assert.equal(rewriteUrl('//cdn.example.net/x.js', page), '/p/https://cdn.example.net/x.js');
  assert.equal(rewriteUrl('https://other.org/', page), '/p/https://other.org/');
  for (const kept of ['#top', 'javascript:void(0)', 'data:image/png;base64,AAA', 'mailto:a@b.c', 'tel:123', '']) assert.equal(rewriteUrl(kept, page), kept);
});

test('srcset, CSS and meta refresh', () => {
  assert.equal(rewriteSrcset('a.png 1x, /b.png 2x', page), '/p/https://example.com/docs/a.png 1x, /p/https://example.com/b.png 2x');
  assert.equal(rewriteCss('body{background:url("/bg.png")} @import "theme.css"; .x{background:url(data:image/png;base64,AA)}', page),
    'body{background:url("/p/https://example.com/bg.png")} @import "/p/https://example.com/docs/theme.css"; .x{background:url(data:image/png;base64,AA)}');
  assert.equal(rewriteRefresh('5; url=/next', page), '5; url=/p/https://example.com/next');
});

test('private and local addresses are refused', () => {
  for (const host of ['localhost', 'app.localhost', '127.0.0.1', '10.1.2.3', '192.168.0.10', '172.20.0.1', '169.254.169.254', '100.64.0.1', '[::1]', 'fd00::1', 'intranet', 'printer.local', 'metadata.google.internal', '0.0.0.0'])
    assert.equal(isPrivateHost(host), true, host);
  for (const host of ['example.com', '8.8.8.8', '172.32.0.1', 'en.wikipedia.org'])
    assert.equal(isPrivateHost(host), false, host);
});
