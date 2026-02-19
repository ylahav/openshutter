import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication) {
  // Get API base URL from environment variable (e.g., https://api.yairl.com)
  // If not set, try to derive from FRONTEND_URL (replace domain with api.domain)
  // Falls back to localhost for development
  let apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl && process.env.FRONTEND_URL) {
    const frontendUrl = process.env.FRONTEND_URL.split(',')[0].trim(); // Use first URL if multiple
    try {
      const url = new URL(frontendUrl);
      // Replace subdomain with 'api' (e.g., https://yairl.com -> https://api.yairl.com)
      apiBaseUrl = `${url.protocol}//api.${url.hostname}${url.port ? `:${url.port}` : ''}`;
    } catch {
      // If FRONTEND_URL is not a valid URL, fall back to localhost
      apiBaseUrl = `http://localhost:${process.env.PORT || 5000}`;
    }
  }
  if (!apiBaseUrl) {
    apiBaseUrl = `http://localhost:${process.env.PORT || 5000}`;
  }
  const isProduction = process.env.NODE_ENV === 'production';

  const config = new DocumentBuilder()
    .setTitle('OpenShutter API')
    .setDescription(
      'OpenShutter Public API v1 - A comprehensive photo gallery management system API. ' +
      'Use API keys for authentication. Get your API key from the developer portal.',
    )
    .setVersion('1.0.0')
    .setContact('OpenShutter Team', 'https://openshutter.org', 'support@openshutter.org')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:5000', 'Development server')
    .addServer(apiBaseUrl, isProduction ? 'Production server' : 'Current server')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'API Key authentication. Format: Bearer {your_api_key}',
      },
      'apiKey',
    )
    .addTag('albums', 'Album management endpoints')
    .addTag('photos', 'Photo management endpoints')
    .addTag('tags', 'Tag management endpoints')
    .addTag('people', 'People management endpoints')
    .addTag('locations', 'Location management endpoints')
    .addTag('pages', 'Page management endpoints')
    .addTag('search', 'Search endpoints')
    .addTag('info', 'API information endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Add security scheme to all endpoints
  document.components = {
    ...document.components,
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'API Key authentication. Format: Bearer {your_api_key}',
      },
    },
  };

  SwaggerModule.setup('api/v1/docs', app, document, {
    customSiteTitle: 'OpenShutter API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  return document;
}
