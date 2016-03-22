exports.register = function(server, options, next) {

  if (!options.view) {
    return next(new Error('must pass in view path'));
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

      var payload = response.output.payload;

      return reply.view(options.view, {
        statusCode: response.output.statusCode,
        error: payload.error,
        message: payload.message
      }).code(response.output.statusCode);
    }

    reply.continue();
  });
  next();

};

exports.register.attributes = {
  pkg: require('./package.json')
};
