import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Order } from "./entities/order.entity"
import { OrderItem } from "./entities/order-item.entity"
import type { CreateOrderDto } from "./dto/order.dto"
import { v4 as uuidv4 } from "uuid"
import { PRODUCTS } from "./mock-products"
import { PARTNERS } from "./mock-partners"

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name)

  // Supplier ID to name mapping
  private readonly supplierIdToName = {
    "1": "marrakechfinefood",
  };

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    // Log the incoming data
    this.logger.log(`Creating order with ${createOrderDto.items?.length || 0} items`)

    // Debug the incoming DTO
    console.log("CreateOrderDto:", JSON.stringify(createOrderDto))

    // Create a new order
    const order = new Order()
    order.reference = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`
    order.orderDate = new Date()
    order.status = "En attente"
    order.supplier = createOrderDto.supplier || ""
    order.totalAmount = 0 // Initialize to avoid null constraint

    // Set user ID if provided
    if (createOrderDto.userId) {
      order.userId = Number.parseInt(createOrderDto.userId.toString(), 10)
    }
    console.log("Parsed userId:", order)

    // Save the order first to get an ID
    const savedOrder = await this.orderRepository.save(order)
    this.logger.log(`Created order with ID: ${savedOrder.id}`)

    // Calculate total amount and create order items
    let totalAmount = 0

    // Check if items exist in the DTO
    if (createOrderDto.items && Array.isArray(createOrderDto.items) && createOrderDto.items.length > 0) {
      // Process each item
      for (const item of createOrderDto.items) {
        // Create a new order item
        const orderItem = new OrderItem()
        orderItem.orderId = savedOrder.id
        orderItem.productName = item.productName
        orderItem.quantity = item.quantity
        orderItem.unitPrice = item.unitPrice
        orderItem.justification = item.justification || createOrderDto.justification || ""

        // Save the item immediately
        await this.orderItemRepository.save(orderItem)

        // Update total amount
        totalAmount += item.quantity * item.unitPrice
      }

      // Update the order with the total amount
      savedOrder.totalAmount = totalAmount
      await this.orderRepository.update(savedOrder.id, { totalAmount })
      console.log(`Updated order total amount to ${savedOrder}`)
      this.logger.log(`Updated order total amount to ${totalAmount}`)
    } else {
      this.logger.warn("No items found in the order DTO")
    }

    // Return the complete order with items
    return this.getOrderById(savedOrder.id)
  }

  // Fixed getOrders method to ensure it retrieves all orders with items
  async getOrders(): Promise<Order[]> {
    try {
      this.logger.log("Getting all orders with items")

      // Use query builder for more control
      const orders = await this.orderRepository
        .createQueryBuilder("order")
        .leftJoinAndSelect("order.items", "items")
        .orderBy("order.createdAt", "DESC")
        .getMany()

      this.logger.log(`Retrieved ${orders.length} orders`)

      // Log each order for debugging
      orders.forEach((order) => {
        this.logger.log(`Order #${order.id}: ${order.reference}, Items: ${order.items?.length || 0}`)
      })

      return orders
    } catch (error) {
      this.logger.error(`Error getting orders: ${error.message}`)
      throw error
    }
  }

  async getOrderById(id: number): Promise<Order> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id },
        relations: ["items"],
      })

      if (!order) {
        this.logger.warn(`Order with ID ${id} not found`)
        throw new Error(`Order with ID ${id} not found`)
      }

      this.logger.log(`Retrieved order ${id} with ${order.items?.length || 0} items`)
      return order
    } catch (error) {
      this.logger.error(`Error getting order by ID ${id}: ${error.message}`)
      throw error
    }
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const order = await this.getOrderById(id)
    order.status = status
    return this.orderRepository.save(order)
  }

  // Get products with optional filtering
  getProducts(supplier?: string, category?: string, search?: string) {
    try {
      console.log("getProducts called with:", { supplier, category, search })
      console.log("PRODUCTS available:", PRODUCTS ? "Yes" : "No")

      // If PRODUCTS is not available, return a fallback array
      if (!PRODUCTS || !Array.isArray(PRODUCTS)) {
        console.error("PRODUCTS is not properly defined:", PRODUCTS)
        return [
          {
            id: "fallback1",
            name: "Fallback Product",
            price: 100,
            supplier: "Fallback Supplier",
            description: "This is a fallback product",
            category: "Fallback",
            unit: "Piece",
            imageUrl: "https://example.com/fallback.jpg",
          },
        ]
      }

      // Start with all products
      let filteredProducts = [...PRODUCTS]

      // Apply supplier filter if provided
      if (supplier) {
        console.log(`Filtering by supplier ID: ${supplier}`)

        // Map supplier ID to supplier name if it exists in our mapping
        const supplierName = this.supplierIdToName[supplier]
        console.log(`Mapped supplier ID ${supplier} to name: ${supplierName || "No mapping found"}`)

        if (supplierName) {
          // Filter by the mapped supplier name
          filteredProducts = filteredProducts.filter(
            (product) => product.supplier.toLowerCase() === supplierName.toLowerCase(),
          )
        } else {
          // If no mapping exists, try to filter by the supplier ID directly
          // This is a fallback and might not work depending on how products are structured
          filteredProducts = filteredProducts.filter(
            (product) => product.supplier === supplier || (product.supplier && product.supplier === supplier),
          )
        }
      }

      // Apply category filter if provided
      if (category) {
        filteredProducts = filteredProducts.filter(
          (product) => product.category.toLowerCase() === category.toLowerCase(),
        )
      }

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase()
        filteredProducts = filteredProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(searchLower) || product.description.toLowerCase().includes(searchLower),
        )
      }

      console.log(`Returning ${filteredProducts.length} products after filtering`)

      // If no products match after filtering, return all products
      if (filteredProducts.length === 0) {
        console.log("No products match the filters, returning all products")
        return PRODUCTS
      }
      console.log("Filtered products:", filteredProducts)

      return filteredProducts
    } catch (error) {
      console.error("Error in getProducts:", error)
      // Return all products in case of error
      return PRODUCTS
    }
  }

  // Mock methods for partners
  getPartners() {
    // Implementation would depend on your actual data source
    return PARTNERS || []
  }
}
