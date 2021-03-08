# hapi-friendly-errors

[![Coverage Status](https://coveralls.io/repos/github/firstandthird/hapi-friendly-errors/badge.svg)](https://coveralls.io/github/firstandthird/hapi-friendly-errors)

A small library for displaying very friendly errors in hapi.

## Installation

```
npm install hapi-friendly-errors
```

## Basic Usage

 Just register like a normal hapi plugin:

```js
await server.register({
  plugin: require('hapi-friendly-errors')
});
```

If you have a broken route like this:
```js
server.route({
  path: '/foobar',
  method: 'GET',
  handler(request, reply) {
    throw Boom.notFound('this is not foobar');
  }
});
```

when you fetch the _/foobar_ route, you will get back a 404 code with the following:

```html
<h1>There was an error</h1>
<h2>Not Found: this is not foobar</h2>
```

## Custom Views

hapi-friendly-errors will also work with your view engine if you want a custom error page.  For example
if you have a [handlebars](https://handlebarsjs.com/) template named _error-page_:

```html
<h1>Unfortunately You Have Encountered an Error</h1>

<b>Error</b>: {{error}}
<b>Reason</b>: {{message}}
<b>Additional Stuff</b>: {{protocol}}{{domain}}
```

```js
await server.register({
  plugin: require('hapi-friendly-errors'),
  options: {
    view: 'error-page'
  }
});
server.views({
  engines: { html: require('handlebars') },
  context: {
    protocol: 'http://',
    domain: 'foobar.com'
  }
});
```

Now fetching the _/foobar_ route will give:

```html
<h1>Unfortunately You Have Encountered an Error</h1>

<b>Error</b>: Not Found
<b>Reason</b>: this is not foobar
<b>Additional Stuff</b>: http://foobar.com
```

## JSON

hapi-friendly-errors will skip HTML and just return a JSON object when requests contain the _Accept: application/json_ header:
```js
{ statusCode: 403, error: 'Forbidden', message: 'Not Authorized' }
```


## Plugin Options

  You can pass these when you register the plugin

- __errorBlacklist__

  A regular expression passed as a string. Routes matching this regular expression will be ignored by hapi-friendly-errors

- __logErrors__

  When true will log output any time there is a 500 Server error.

- __url__

  You can also specify a local URL to render and return HTML errors, when this happens the statusCode, error and message will be passed as query parameters:

  ```js
  await server.register({
    plugin: require('hapi-friendly-errors'),
    options: {
      url: '/error'
    }
  });

  server.route({
    path: '/foobar',
    method: 'GET',
    handler(request, reply) {
      throw Boom.notFound('this is not foobar');
    }
  });

  server.route({
    path: '/error',
    method: 'GET',
    handler(request, h) {
      const query = request.query;
      return `
      <h1>An Error Handled by Route</h1>
      <b>Error</b> ${query.statusCode} ${query.error.}
      <b>Message</b> ${query.message}
      `;
    }
  });
  ```

  Now when you call the _/foobar_ route you will get back:
  ```HTML
  <h1>An Error Handled by Route</h1>
  <b>Error</b> 404 Not Found
  <b>Message</b> this is not foobar!
  ```

- __context__

  An object that will be merged with the context and passed to the rendering engine. If specified, _error_, _message_ and _statusCode_ will be overridden.
  ```js
  await server.register({
    plugin: require('hapi-friendly-errors'),
    options: {
      context: {
        data1: 'some more data',
        error: 'A Server Error'
      }
    }
  });
  ```

  Now errors will look something like:

  ```html
  <h1>There was an error</h1>
  <h2>A Server Error: this is not foobar</h2>
  ```

- __view__

  Name of the view to render, if not specified then view will default to:

  ```js
  `<h1>There was an error</h1><h2>${context.error}: ${context.message}</h2>`
  ```
