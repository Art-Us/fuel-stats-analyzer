import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fuel Cost Tracker API',
      version: '1.0.0',
      description: 'API backendu dla aplikacji do śledzenia kosztów paliwa i zużycia (l/100km, koszt/km)',
      contact: {
        name: 'Senior Node.js & TypeScript Developer'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serwer deweloperski'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
