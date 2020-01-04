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
  lab.before(async() => {
    server = new Hapi.Server({
      debug: {
        log: ['error']
      },
      port: 3000
    });
    const response = await server.register({
      plugin: friendlyErrors,
      options: {
        logErrors: true,
        view: 'error'
      }
    });
    await server.register(Vision);
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
        return 'Hello';
      }
    });

    server.route({
      path: '/not-found',
      method: 'GET',
      handler(request, reply) {
        throw Boom.notFound('not found here');
      }
    });

    server.route({
      path: '/api-route',
      method: 'GET',
      handler(request, reply) {
        throw Boom.forbidden('Not Authorized', { user: false });
      }
    });
    await server.start();
  });

  lab.test(' returns friendly error page', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/not-found',
      headers: {
        accept: 'text/html'
      }
    });
    code.expect(response.statusCode).to.equal(404);
    code.expect(response.payload).to.startWith('<h1>ERROR not found here</h1>');
  });

  lab.test(' includes global view context in template', async() => {
    const response = await server.inject({
      method: 'GET',
      url: '/not-found',
      headers: {
        accept: 'text/html'
      }
    });
    code.expect(response.statusCode).to.equal(404);
    code.expect(response.payload).to.contain('<p>VALUE</p>');
  });

  lab.test(' should pass json for non html requests', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api-route',
      headers: {
        accept: 'application/json'
      }
    });
    code.expect(response.result).to.be.an.object();
    code.expect(response.result.statusCode).to.equal(403);
    code.expect(response.result.message).to.equal('Not Authorized');
  });

  lab.test(' should pass on non boom responses', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        accept: 'text/html'
      },
    });
    code.expect(response.result).to.equal('Hello');
  });
});

lab.experiment('url', () => {
  let server;
  lab.beforeEach(async() => {
    server = new Hapi.Server({
      debug: {
        log: ['error']
      },
      port: 3001
    });
    await server.register({
      plugin: friendlyErrors,
      options: {
        logErrors: true,
        url: '/error'
      }
    });

    server.route({
      path: '/not-found',
      method: 'GET',
      handler(request, reply) {
        throw Boom.notFound('not found here');
      }
    });

    server.route({
      path: '/forbidden',
      method: 'GET',
      handler(request, reply) {
        throw Boom.forbidden('Not Authorized', { user: false });
      }
    });

    server.route({
      path: '/error',
      method: 'GET',
      handler(request, reply) {
        return request.query;
      }
    });
    await server.start();
  });
  lab.afterEach( async () => {
    await server.stop();
  });
  lab.test('should serve up /error and pass in query from error', async () => {
    const res = await server.inject({
      url: '/not-found',
      headers: {
        accept: 'text/html'
      }
    });
    code.expect(res.statusCode).to.equal(404);
    code.expect(JSON.parse(res.payload)).to.equal({
      statusCode: '404',
      error: 'Not Found',
      message: 'not found here'
    });
  });
  lab.test('should serve up /error and pass in query from error', async () => {
    const res = await server.inject({
      url: '/forbidden',
      headers: {
        accept: 'text/html'
      }
    });
    code.expect(res.statusCode).to.equal(403);
    code.expect(JSON.parse(res.payload)).to.equal({
      statusCode: '403',
      error: 'Forbidden',
      message: 'Not Authorized'
    });
  });
});

lab.experiment('hapi-friendly-errors default page', () => {
  let server;
  lab.before(async () => {
    server = new Hapi.Server({
      debug: {
        log: ['error']
      },
      port: 3001
    });
    await server.register({
      plugin: friendlyErrors,
      options: {
        logErrors: true
      }
    });
    await server.register(Vision);
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
        return 'Hello';
      }
    });
    server.route({
      path: '/not-found',
      method: 'GET',
      handler(request, reply) {
        throw Boom.notFound('not found here');
      }
    });
    server.route({
      path: '/api-route',
      method: 'GET',
      handler(request, reply) {
        throw Boom.forbidden('Not Authorized', { user: false });
      }
    });
    await server.start();
  });
  lab.after(async() => {
    await server.stop();
  });

  lab.test(' should return a friendly error page if none was specified', async() => {
    const response = await server.inject({
      method: 'GET',
      url: '/not-found',
      headers: {
        accept: 'text/html'
      }
    });
    code.expect(response.statusCode).to.equal(404);
    code.expect(response.payload).to.startWith('<h1>There was an error</h1>');
  });
});

lab.experiment('url - error on error page', () => {
  let server;
  lab.beforeEach(async() => {
    server = new Hapi.Server({
      debug: {
        log: ['error']
      },
      port: 3001
    });
    await server.register({
      plugin: friendlyErrors,
      options: {
        logErrors: true,
        url: '/error'
      }
    });
    server.route({
      path: '/error',
      method: 'GET',
      handler(request, reply) {
        throw Boom.notFound();
      }
    });
    await server.start();
  });
  lab.afterEach(async () => {
    await server.stop();
  });
  lab.test('should serve up basic response if error url is erroring', async () => {
    const res = await server.inject({
      url: '/not-found',
      headers: {
        accept: 'text/html'
      }
    });
    code.expect(res.statusCode).to.equal(404);
    code.expect(res.payload).to.equal('404 - Not Found');
  });
});
