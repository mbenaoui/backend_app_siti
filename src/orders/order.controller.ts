import { Controller, Post, Get, Body, Param, Query, UseGuards, Request, Logger } from "@nestjs/common"
import  { OrderService } from "./order.service"
import  { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import  { OrderNotificationService } from "./order-notification.service"

@Controller("orders")
export class OrderController {
  private readonly logger = new Logger(OrderController.name)

  constructor(
    private readonly orderService: OrderService,
    private readonly notificationService: OrderNotificationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    console.log(`Creating order for user ${req.user.id}`)
    console.log(`Order contains ${createOrderDto} items`)
    // this.logger.log(`Creating order for user ${req.user.id}`)

    // Add the user ID to the order
    const order = await this.orderService.createOrder({
      ...createOrderDto,
      userId: req.user.id,
    })

    // Send WhatsApp notification
    try {
      await this.notificationService.notify(order)
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`)
      // Continue even if notification fails
    }

    return order
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('supplier') supplier?: string) {
    console.log(`Fetching orders with status: ${status} and supplier: ${supplier}`)
    return this.orderService.getOrders()
  }

  @Get("products")
  getProducts(
    @Query('supplier') supplier?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    console.log(`Fetching products with supplier: ${supplier}, category: ${category}, search: ${search}`)
    return this.orderService.getProducts(supplier, category, search)
  }

  @Get("partners")
  getPartners() {
    return this.orderService.getPartners()
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.getOrderById(+id);
  }

  @Post(":id/notify")
  async notify(@Param('id') id: string, @Body() body: { method: 'email' | 'whatsapp' }) {
    this.logger.log(`Manual notification request for order ${id} via ${body.method}`)

    const order = await this.orderService.getOrderById(+id)
    const success = await this.notificationService.notify(order)

    return { success }
  }

  @Post(":id/status")
  async updateStatus(@Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.orderService.updateOrderStatus(+id, body.status)
  }
}
