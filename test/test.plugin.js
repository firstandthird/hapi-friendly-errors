'use strict';

const code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const Boom = require('boom');
const Vision = require('vision');
const friendlyErrors = require('../');

lab.experiment('hapi-friendly-errors', () => {
  let server;
  lab.before((done) => {
    server = new Hapi.Server({
      debug: {
        log: ['error']
      }
    });
    server.connection({ port: 3000 });
    server.register({
      register: friendlyErrors,
      options: {
        logErrors: true,
        view: 'error'
      }
    }, (err) => {
      code.expect(err).to.be.undefined();
    });

    server.register(Vision, (err) => {
      if (err) {
        throw err;
      }

      server.views({
        engines: { html: require('handlebars') },
        path: `${__dirname}/tmpl`,
        context: {
          someData: 'VALUE'
        }
      });

      server.route({
        path: '/',
        method: 'GET',
        handler(request, reply) {
          reply('Hello');
        }
      });

      server.route({
        path: '/not-found',
        method: 'GET',
        handler(request, reply) {
          reply(Boom.notFound('not found here'));
        }
      });

      server.route({
        path: '/api-route',
        method: 'GET',
        handler(request, reply) {
          reply(Boom.forbidden('Not Authorized', { user: false }));
        }
      });

      server.start((err) => {
        code.expect(err).to.be.undefined();
        done();
      });
    });
  });

  lab.test(' should validate that a view option exists', (allDone) => {
    const testServer =  new Hapi.Server({
      debug: {
        log: ['error']
      }
    });

    testServer.register({
      register: friendlyErrors,
      options: {
        logErrors: true
      }
    }, (err) => {
      code.expect(err).to.be.an.error();
      allDone();
    });
  });

  lab.test(' returns friendly error page', (allDone) => {
    server.inject({
      method: 'GET',
      url: '/not-found',
      headers: {
        accept: 'text/html'
      }
    }, (response) => {
      code.expect(response.statusCode).to.equal(404);
      code.expect(response.payload).to.startWith('<h1>ERROR not found here</h1>');
      allDone();
    });
  });

  lab.test(' includes global view context in template', (allDone) => {
    server.inject({
      method: 'GET',
      url: '/not-found',
      headers: {
        accept: 'text/html'
      }
    }, (response) => {
      code.expect(response.statusCode).to.equal(404);
      code.expect(response.payload).to.contain('<p>VALUE</p>');
      allDone();
    });
  });

  lab.test(' should pass json for non html requests', (allDone) => {
    server.inject({
      method: 'GET',
      url: '/api-route',
      headers: {
        accept: 'application/json'
      }
    }, (response) => {
      code.expect(response.result).to.be.an.object();
      code.expect(response.result.statusCode).to.equal(403);
      code.expect(response.result.message).to.equal('Not Authorized');
      allDone();
    });
  });

  lab.test(' should pass on non boom responses', (allDone) => {
    server.inject({
      method: 'GET',
      url: '/',
      headers: {
        accept: 'text/html'
      },
    }, (response) => {
      code.expect(response.result).to.equal('Hello');
      allDone();
    });
  });
});

lab.experiment('url', () => {
  let server;
  lab.beforeEach((done) => {
    server = new Hapi.Server({
      debug: {
        log: ['error']
      }
    });
    server.connection({ port: 3001 });
    server.register({
      register: friendlyErrors,
      options: {
        logErrors: true,
        url: '/error'
      }
    }, (err) => {
      code.expect(err).to.be.undefined();
    });

    server.route({
      path: '/not-found',
      method: 'GET',
      handler(request, reply) {
        reply(Boom.notFound('not found here'));
      }
    });

    server.route({
      path: '/forbidden',
      method: 'GET',
      handler(request, reply) {
        reply(Boom.forbidden('Not Authorized', { user: false }));
      }
    });

    server.route({
      path: '/error',
      method: 'GET',
      handler(request, reply) {
        reply(null, request.query);
      }
    });

    server.start((err) => {
      code.expect(err).to.be.undefined();
      done();
    });
  });
  lab.afterEach((done) => {
    server.stop(done);
  });
  lab.test('should serve up /error and pass in query from error', (done) => {
    server.inject('/not-found', (res) => {
      code.expect(res.statusCode).to.equal(404);
      code.expect(JSON.parse(res.payload)).to.equal({
        statusCode: '404',
        error: 'Not Found',
        message: 'not found here'
      });
      done();
    });
  });
  lab.test('should serve up /error and pass in query from error', (done) => {
    server.inject('/forbidden', (res) => {
      code.expect(res.statusCode).to.equal(403);
      code.expect(JSON.parse(res.payload)).to.equal({
        statusCode: '403',
        error: 'Forbidden',
        message: 'Not Authorized'
      });
      done();
    });
  });
});
