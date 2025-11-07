const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Koders4Hire API',
      version: '1.0.0',
      description: 'Interactive API documentation for Koders4Hire',
    },
    servers: [
      { url: 'https://api.k4h.dev', description: 'Production API server' },
      { url: 'http://localhost:3000', description: 'Local API server' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
  },
  apis: ['./routes/*.js']
};
const swaggerSpec = swaggerJsDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
