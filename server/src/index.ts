import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  createItemInputSchema,
  updateItemInputSchema,
  adjustStockInputSchema,
  createSupplierInputSchema,
  createPurchaseOrderInputSchema,
  createWorkOrderInputSchema,
  completeWorkOrderInputSchema,
  purchaseTrendInputSchema,
  userRoleSchema,
  type UserRole
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createItem } from './handlers/create_item';
import { getItems } from './handlers/get_items';
import { updateItem } from './handlers/update_item';
import { adjustStock } from './handlers/adjust_stock';
import { createSupplier } from './handlers/create_supplier';
import { getSuppliers } from './handlers/get_suppliers';
import { createPurchaseOrder } from './handlers/create_purchase_order';
import { getPurchaseOrders } from './handlers/get_purchase_orders';
import { createWorkOrder } from './handlers/create_work_order';
import { getWorkOrders } from './handlers/get_work_orders';
import { completeWorkOrder } from './handlers/complete_work_order';
import { getInventoryHealth } from './handlers/get_inventory_health';
import { getPurchaseTrends } from './handlers/get_purchase_trends';
import { getLowStockAlerts } from './handlers/get_low_stock_alerts';
import { getStockAdjustments } from './handlers/get_stock_adjustments';

// Context type for authentication and user info
interface Context {
  userId?: string; // Clerk user ID
  userRole?: UserRole;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// RBAC Middleware
const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

const requireRole = (allowedRoles: UserRole[]) =>
  requireAuth.unstable_pipe(({ ctx, next }) => {
    if (!ctx.userRole || !allowedRoles.includes(ctx.userRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }
    return next({ ctx });
  });

// Protected procedures
const protectedProcedure = t.procedure.use(requireAuth);
const adminProcedure = t.procedure.use(requireRole(['ADMIN']));
const warehouseManagerProcedure = t.procedure.use(requireRole(['ADMIN', 'WAREHOUSE_MANAGER']));
const purchasingProcedure = t.procedure.use(requireRole(['ADMIN', 'PURCHASING_STAFF']));
const technicianProcedure = t.procedure.use(requireRole(['ADMIN', 'TECHNICIAN']));

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  users: router({
    create: adminProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    
    list: protectedProcedure
      .query(() => getUsers()),
  }),

  // Inventory management routes
  inventory: router({
    // Items management
    items: router({
      create: warehouseManagerProcedure
        .input(createItemInputSchema)
        .mutation(({ input }) => createItem(input)),
      
      list: protectedProcedure
        .query(() => getItems()),
      
      update: warehouseManagerProcedure
        .input(updateItemInputSchema)
        .mutation(({ input }) => updateItem(input)),
    }),

    // Stock adjustments
    adjustStock: warehouseManagerProcedure
      .input(adjustStockInputSchema)
      .mutation(({ input, ctx }) => adjustStock(input, ctx.userId)),

    // Stock adjustments history
    adjustments: protectedProcedure
      .query(() => getStockAdjustments()),

    // Low stock alerts
    lowStockAlerts: protectedProcedure
      .query(() => getLowStockAlerts()),

    // Inventory health report
    healthReport: protectedProcedure
      .query(() => getInventoryHealth()),
  }),

  // Supplier management routes
  suppliers: router({
    create: purchasingProcedure
      .input(createSupplierInputSchema)
      .mutation(({ input }) => createSupplier(input)),
    
    list: protectedProcedure
      .query(() => getSuppliers()),
  }),

  // Purchase order management routes
  purchaseOrders: router({
    create: purchasingProcedure
      .input(createPurchaseOrderInputSchema)
      .mutation(({ input, ctx }) => createPurchaseOrder(input, ctx.userId)),
    
    list: protectedProcedure
      .query(() => getPurchaseOrders()),

    // Purchase trends for analytics
    trends: protectedProcedure
      .input(purchaseTrendInputSchema)
      .query(({ input }) => getPurchaseTrends(input)),
  }),

  // Work order management routes
  workOrders: router({
    create: warehouseManagerProcedure
      .input(createWorkOrderInputSchema)
      .mutation(({ input, ctx }) => createWorkOrder(input, ctx.userId)),
    
    list: protectedProcedure
      .query(() => getWorkOrders()),

    complete: technicianProcedure
      .input(completeWorkOrderInputSchema)
      .mutation(({ input }) => completeWorkOrder(input)),
  }),

  // Analytics and reporting routes
  analytics: router({
    inventoryHealth: protectedProcedure
      .query(() => getInventoryHealth()),
    
    purchaseTrends: protectedProcedure
      .input(purchaseTrendInputSchema)
      .query(({ input }) => getPurchaseTrends(input)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext({ req }): Context {
      // In a real implementation, you would extract the user information from the request
      // This could be from Clerk's JWT token, session, or other authentication mechanism
      // For now, returning empty context - this should be implemented with actual auth
      return {
        userId: req.headers['x-user-id'] as string, // Placeholder - extract from auth token
        userRole: req.headers['x-user-role'] as UserRole, // Placeholder - extract from auth token
      };
    },
  });
  
  server.listen(port);
  console.log(`🚀 ERP tRPC server listening at port: ${port}`);
  console.log(`📊 Available modules: Users, Inventory, Suppliers, Purchase Orders, Work Orders, Analytics`);
}

start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});