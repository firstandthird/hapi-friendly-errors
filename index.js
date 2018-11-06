'use strict';

const register = function(server, options) {
  server.ext('onPreResponse', async (request, h) => {
    const response = request.response;
    const path = request.path;
    if (response.isBoom) {
      //if application/json, skip
      if (request.headers.accept && request.headers.accept.match(/application\/json/)) {
        return h.continue;
      }
      if (options.errorBlacklist && path.match(new RegExp(options.errorBlacklist))) {
        return h.continue;
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
        if (request.path === options.url) {
          //error page is erroring
          return `${request.query.statusCode} - ${request.query.error}`;
        }
        const { statusCode, error, message } = response.output.payload;
        const res = await server.inject({
          url: `${options.url}?statusCode=${statusCode}&error=${error}&message=${message}`,
          method: 'GET',
        });

        const resp = h
          .response(res.payload)
          .code(response.output.statusCode);

        resp._error = {
          stack: null,
          data: response.data,
          output: response.output
        };

        return resp;
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
        const resp = h
          .response(`<h1>There was an error</h1><h2>${context.error}: ${context.message}</h2>`)
          .code(response.output.statusCode);
        resp._error = {
          stack: null,
          data: response.data,
          output: response.output
        };

        return resp;
      }
      const resp = h
        .view(options.view, context)
        .code(response.output.statusCode);

      resp._error = {
        stack: null,
        data: response.data,
        output: response.output
      };

      return resp;
    }
    return h.continue;
  });
};

exports.plugin = {
  once: true,
  pkg: require('./package.json'),
  register
};
