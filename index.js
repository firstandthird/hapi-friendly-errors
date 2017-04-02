

exports.register = function(server, options, next) {

  if (!options.view && !options.url) {
    return next(new Error('must pass in view path or url'));
  }

  server.ext('onPreResponse', function(request, reply) {
    var response = request.response;
    var path = request.path;

    if (response.isBoom) {

      //if application/json, skip
      if (request.headers['accept'] && request.headers['accept'].match(/application\/json/)) {
        return reply.continue();
      }

      if (options.errorBlacklist && path.match(new RegExp(options.errorBlacklist))) {
        return reply.continue();
      }

      if (options.logErrors && response.output.statusCode == 500) {
        server.log(['error'], {
          output: response.output,
          path: request.path,
          method: request.method,
          payload: request.payload,
          stack: response.stack
        });
      }
      if (options.url) {
        const { statusCode, error, message } = response.output.payload
        server.inject({
          url: `${options.url}?statusCode=${statusCode}&error=${error}&message=${message}`,
          method: 'GET',
        }, (res) => {
          reply(null, res.payload).code(response.output.statusCode);
        })
        return;
      }

      var payload = response.output.payload;

      var context = {
        statusCode: response.output.statusCode,
        error: payload.error,
        message: payload.message
      };

      if (options.context) {
        for (var key in options.context) {
          if (options.context.hasOwnProperty(key)) context[key] = options.context[key];
        }
      }

      return reply.view(options.view, context).code(response.output.statusCode);
    }

    reply.continue();
  });
  next();

};

exports.register.attributes = {
  pkg: require('./package.json')
};
