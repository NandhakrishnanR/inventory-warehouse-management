import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Enterprise ERP Multi-Location Inventory & Warehouse Management API',
    version: '1.0.0',
    description:
      'High-performance REST API for enterprise inventory traceability, multi-tier warehouse hierarchy, purchase requisitions, goods receipts, inter-warehouse transfers, cycle counts, and approval workflows.',
    contact: {
      name: 'Enterprise ERP Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login with username or email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  usernameOrEmail: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully with JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile and roles',
        responses: {
          200: { description: 'User profile returned' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/warehouses/tree': {
      get: {
        tags: ['Warehouses'],
        summary: 'Get complete warehouse hierarchy tree (Company -> City -> Site -> Warehouse -> Zone -> Rack -> Bin)',
        responses: {
          200: { description: 'Hierarchical tree structure returned' },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List products with search, stock metrics, and reorder alerts',
        responses: {
          200: { description: 'Products list' },
        },
      },
    },
    '/api/inventory/balances': {
      get: {
        tags: ['Inventory'],
        summary: 'Query current stock balances with available, on-hand, and reserved metrics',
        responses: {
          200: { description: 'Stock balances list' },
        },
      },
    },
    '/api/inventory/movements': {
      get: {
        tags: ['Inventory'],
        summary: 'Query immutable stock movement ledger (source of truth)',
        responses: {
          200: { description: 'Stock movement transaction ledger' },
        },
      },
    },
    '/api/receiving/goods-receipts': {
      post: {
        tags: ['Receiving'],
        summary: 'Create Goods Receipt Note (GRN) with inspection quantities and putaway tasks',
        responses: {
          201: { description: 'GRN created and putaway tasks generated' },
        },
      },
    },
    '/api/transfers': {
      post: {
        tags: ['Transfers'],
        summary: 'Create inter-warehouse or bin-to-bin stock transfer request',
        responses: {
          201: { description: 'Transfer request created' },
        },
      },
    },
    '/api/approvals/inbox': {
      get: {
        tags: ['Approvals'],
        summary: 'Get current user pending approvals based on role hierarchy',
        responses: {
          200: { description: 'Pending approval inbox items' },
        },
      },
    },
    '/api/reports/stock-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Enterprise stock KPI summary, warehouse breakdowns, and valuation',
        responses: {
          200: { description: 'Executive dashboard metrics' },
        },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
