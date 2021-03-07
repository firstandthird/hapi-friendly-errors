# Hapi FRIENDLY Errors

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

Say you have a broken route like this:
```js
server.route({
  path: '/foobar',
  method: 'GET',
  handler(request, reply) {
    throw Boom.notFound('this is not foobar');
  }
});
```

If you fetch the _/foobar_ route you will get back a 404 code with the following:

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



## Options
