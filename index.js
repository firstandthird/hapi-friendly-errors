'use strict';

exports.register = function(server, options, next) {
  server.ext('onPreResponse', (request, reply) => {
    const response = request.response;
    const path = request.path;

    if (response.isBoom) {
      //if application/json, skip
      if (request.headers.accept && request.headers.accept.match(/application\/json/)) {
        return reply.continue();
      }
      if (options.errorBlacklist && path.match(new RegExp(options.errorBlacklist))) {
        return reply.continue();
      }
      if (options.logErrors && response.output.statusCode === 500) {
        server.log(['error'], {
          output: response.output,
          path: request.path,
          method: request.method,
          payload: request.payload,
          stack: response.stack
        });
      }
      if (options.url) {
        server.inject({
          url: `${options.url}?statusCode=${response.output.payload.statusCode}&error=${response.output.payload.error}&message=${response.output.payload.message}`,
          method: 'GET',
        }, (res) => {
          reply(null, res.payload).code(response.output.statusCode);
        });
        return;
      }

      const payload = response.output.payload;

      const context = {
        statusCode: response.output.statusCode,
        error: payload.error,
        message: payload.message
      };

      if (options.context) {
        Object.keys(options.context).forEach((key) => {
          // for (let key in options.context) {
          if (options.context.hasOwnProperty(key)) {
            context[key] = options.context[key];
          }
        });
      }
      // a default error message:
      if (!options.view) {
        return reply(`<h1>There was an error</h1><h2>${context.error}: ${context.message}</h2>`).code(response.output.statusCode);
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
