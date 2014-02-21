var assert = require('chai').assert;
var express = require('express');
var reverse = require('..');

describe('express-reverse', function() {
  var app;
  var req;
  var res;
  var middelware;
  var redirectArgs;
  var noop = function(req, res, next) { next(); };

  beforeEach(function() {
    app = express();
    app.use = function(fn) { middleware = fn; };
    reverse(app);
    res = {
      locals: {},
      redirect: function() { redirectArgs = arguments; }
    };
    req = {
      app: app,
      _parsedUrl: { pathname: '/test' }
    };
  });

  it('should augment express app', function() {
    app.get('/test', noop);
    middleware(req, res, function() {});
    assert.isUndefined(app._namedRoutes);
    app.get('test', '/test', noop);
    middleware(req, res, function() {});
    assert.isDefined(app._namedRoutes);
    // assert.isDefined(app.locals.url);
  });

  it('should add res.redirectToRoute middleware', function() {

    assert.isDefined(res.redirectToRoute);

    app.get('test 1', '/test', noop);
    app.get('test 2', '/test/:x', noop);
    middleware(req, res, function() {});

    res.redirectToRoute('test 1');
    assert.deepEqual(redirectArgs, ['/test']);
    res.redirectToRoute(301, 'test 1');
    assert.deepEqual(redirectArgs, [301, '/test']);
    res.redirectToRoute('test 2', { x: 1 });
    assert.deepEqual(redirectArgs, ['/test/1']);
  });

  describe('reverse routing', function() {
    it.only('should generate reverse route URLs', function() {
      console.log()
      app.get('test 1', '/test', noop);
      app.get('test 2', '/test/:x', noop);
      app.get('test 3', '/test/:x?', noop);
      app.get('test 4', '/test-limited/:x(a|b)?', noop);
      middleware(req, res, function() {});

      console.log(res)
      var url = res.locals.url;
      assert.equal(url('test 1'), '/test');
      assert.equal(url('test 1'), '/test');
      assert.equal(url('test 2', { x: '1' }), '/test/1');
      assert.throws(function() { url('test 2'); }, 'Missing value for "x".');
      assert.equal(url('test 3', { x: '1' }), '/test/1');
      assert.equal(url('test 3'), '/test');
      assert.throws(function() { url('test is not defined'); }, 'Route not found: test is not defined');
    });

    it('should generate reverse route URLs with limiting regex', function() {
      app.get('test 4', '/test-limited/:x(a|b)?', noop);

      var url = app.locals.url;
      assert.equal(url('test 4', { x: 'a' }), '/test-limited/a');
      assert.equal(url('test 4', { x: 'b' }), '/test-limited/b');
      assert.equal(url('test 4'), '/test-limited');
      assert.throws(function() { url('test is not defined'); }, 'Route not found: test is not defined');
    });

    it('should generate reverse route URLs with qeury string', function() {
      app.get('test 4', '/test-limited/:x(a|b)?', noop);

      var url = app.locals.url;
      assert.equal(url('test 4', { x: 'a' }, '&x=y'), '/test-limited/a?x=y');
    });

    it('should generate reverse route URLs with qeury object', function() {
      app.get('test 4', '/test-limited/:x(a|b)?', noop);

      var url = app.locals.url;
      assert.equal(url('test 4', { x: 'a' }, { x: 'y' }), '/test-limited/a?x=y');
    });

    it('should generate reverse route URLs with hash', function() {
      app.get('test 4', '/test-limited/:x(a|b)?', noop);

      var url = app.locals.url;
      assert.equal(url('test 4', { x: 'a' }, { x: 'y' }, '#bang'), '/test-limited/a?x=y#bang');
    });
  });
});