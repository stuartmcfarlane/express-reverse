var methods = require('methods');
var debug = require('debug')('express:reverse');

module.exports = function(app, options) {
  if (!options) options = {};
  if (!options.helperName) options.helperName = 'url';
  augmentVerbs(app);
  addMiddleware(app, options);
};

function augmentVerbs(app) {
  methods.forEach(function(method) {
    var _fn = app[method];
    app[method] = function(name, path) {
      if ((method == 'get' && arguments.length == 1) ||
        (typeof(path) != 'string' && !(path instanceof String)))
        return _fn.apply(this, arguments);

      var args = Array.prototype.slice.call(arguments, 0);
      args.shift();
      var ret = _fn.apply(this, args);

      if (!app._namedRoutes) app._namedRoutes = {};
      var routes = this.routes[method];
      app._namedRoutes[name] = routes[routes.length - 1];

      return ret;
    };
  });
}

function reverseHelper(res, name, params, query, hash) {
  if (typeof name !== 'string') {
    hash = query;
    query = params;
    params = name;
    name = res.locals._matchedRouteName;
  }
  debug('reverseHelper', {name: name, params: params, query: query, hash: hash });
  var route = res.app._namedRoutes[name];
  if (!route) throw new Error('Route not found: ' + name);
  return reverse(res.app._namedRoutes[name].path, params) +
    makeQuery(query) +
    (hash || '');
}

function nameOfMatchedRoute(req) {
  var name;
  for (name in req.app._namedRoutes) {
    if (req.app._namedRoutes[name].regexp.test(req._parsedUrl.pathname)) {
      return name;
    }
  }
}

function addMiddleware(app, options) {
  app.use(function expressReverse(req, res, next) {
    res.locals._matchedRouteName = nameOfMatchedRoute(req);
    debug('route name', res.locals._matchedRouteName);
    var _render = res.render;
    res.render = function wrappedRender(template, locals, cb) {
      locals[options.helperName] = reverseHelper.bind(null, res);
      _render.call(res, template, locals, cb);
    };
    res.redirectToRoute = function redirectToRoute(status, routeName, params, query, hash) {
      if (isNaN(status)) {
        hash = query;
        query = params;
        params = routeName;
        routeName = status;
      }
      if (typeof routeName !== 'string') {
        hash = query;
        query = params;
        params = routeName;
        routeName = res.locals._matchedRouteName;
      }
      debug('redirectToUrl', {status: status, routeName: routeName, params: params, query: query, hash: hash });
      if (!app._namedRoutes[routeName]) {
        throw 'No named route found';
      }
      var url = reverse(app._namedRoutes[routeName].path, params) +
        makeQuery(query) +
        (hash || '');
      if (isNaN(status)) return res.redirect(url);
      else return res.redirect(status, url);
    };
    next();
  });
}

function reverse(path, params) {
  if (!params) params = {};
  var resolved = path.replace(/([\/-])(:\w+(?:\([^\)]*\))?\??)/g, resolveParam);
  debug('url', resolved);
  return resolved;

  function resolveParam(m, delim, p1) {
    var required = !~p1.indexOf('?');
    var param = p1.replace(/([-/:?]|(?:\([^\)]*\))?)/g, '');
    if (required && !params.hasOwnProperty(param))
      throw new Error('Missing value for "' + param + '".');
    return params[param] ? delim + params[param] : '';
  }
}

function makeQuery(query) {
  if (!query) return '';
  if (typeof query === 'string') {
    return '?' + query.replace(/^[\?]?(.*)$/, '$1');
  }
  var vars = [];
  var key;
  for (key in query) {
    vars.push(key + '=' + query[key]);
  }
  if (!vars.length) return '';
  return '?' + vars.join('&');
}
