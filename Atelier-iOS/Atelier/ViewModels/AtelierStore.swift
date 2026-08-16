import Foundation
import SwiftUI
import Combine

class AtelierStore: ObservableObject {
    // Mode
    @Published var selectedTab: Int = 0 // 0: Discover, 1: Cart, 2: Orders, 3: Producer Portal
    
    // Seed Data
    @Published var producers: [Producer] = []
    @Published var products: [Product] = []
    @Published var cart: [CartItem] = []
    @Published var orders: [Order] = []
    
    // Active Navigation State
    @Published var selectedProducer: Producer?
    @Published var activeProduct: Product?
    @Published var activeOrder: Order?
    
    // Feedback Generator
    private let hapticImpact = UIImpactFeedbackGenerator(style: .medium)
    private let hapticSuccess = UINotificationFeedbackGenerator()
    
    init() {
        loadSeedData()
    }
    
    func triggerHapticFeedback() {
        hapticImpact.impactOccurred()
    }
    
    func triggerSuccessFeedback() {
        hapticSuccess.notificationOccurred(.success)
    }
    
    // MARK: - Producer Management
    func createProducer(name: String, category: CraftCategory, city: String, country: DACHCountry, tagline: String, vatNumber: String, leadTimeSchedule: String) -> Producer {
        let newProd = Producer(
            id: "prod-\(Date().timeIntervalSince1970)",
            name: name,
            tagline: tagline,
            category: category,
            country: country,
            city: city,
            currency: country == .ch ? "CHF" : "EUR",
            bio: "Handwerkliche Manufaktur mit Made-to-Order Produktion.",
            heroImageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80",
            vatNumber: vatNumber,
            leadTimeSchedule: leadTimeSchedule,
            batchScheduleNotice: "Wöchentliche Frischecharge",
            establishedYear: Calendar.current.component(.year, from: Date()),
            contactEmail: "kontakt@\(name.lowercased().replacingOccurrences(of: " ", with: "")).ch"
        )
        producers.append(newProd)
        selectedProducer = newProd
        triggerSuccessFeedback()
        return newProd
    }
    
    // MARK: - Cart Methods
    func addToCart(_ item: CartItem) {
        cart.append(item)
        triggerSuccessFeedback()
    }
    
    func removeFromCart(at offsets: IndexSet) {
        cart.remove(atOffsets: offsets)
        triggerHapticFeedback()
    }
    
    var cartTotal: Double {
        cart.reduce(0) { $0 + $1.totalPrice }
    }
    
    // MARK: - Checkout & Order Creation
    func createOrder(customerName: String, email: String, street: String, postalCode: String, city: String, country: DACHCountry, paymentMethod: String) -> Order {
        let producer = cart.first?.producer ?? producers[0]
        let orderNum = "ATL-\(Int.random(in: 1000...9999))"
        
        let newOrder = Order(
            id: UUID().uuidString,
            orderNumber: orderNum,
            producerId: producer.id,
            producerName: producer.name,
            customerName: customerName,
            customerEmail: email,
            customerStreet: street,
            customerCity: city,
            customerPostalCode: postalCode,
            customerCountry: country,
            items: cart,
            status: .paid,
            totalAmount: cartTotal,
            paymentMethod: paymentMethod,
            createdAt: Date(),
            scheduledBatchDate: "Dienstag, 08:00 Uhr"
        )
        
        orders.insert(newOrder, at: 0)
        activeOrder = newOrder
        cart.removeAll()
        triggerSuccessFeedback()
        return newOrder
    }
    
    func updateOrderStatus(orderId: String, newStatus: OrderStatus) {
        if let index = orders.firstIndex(where: { $0.id == orderId }) {
            orders[index].status = newStatus
            triggerHapticFeedback()
        }
    }
    
    // MARK: - Product CRUD
    func saveProduct(_ product: Product) {
        if let index = products.firstIndex(where: { $0.id == product.id }) {
            products[index] = product
        } else {
            products.append(product)
        }
        triggerSuccessFeedback()
    }
    
    // MARK: - Seed Data Loader
    private func loadSeedData() {
        let maelstrom = Producer(
            id: "prod-maelstrom",
            name: "Maelstrom Roasters",
            tagline: "Specialty Coffee & On-Demand Micro-Roasting",
            category: .coffee,
            country: .ch,
            city: "Zürich",
            currency: "CHF",
            bio: "Wir rösten handwerkliche Kaffeespezialitäten in Zürich-West. Unsere Bohnen stammen aus direktem Handel mit Kleinbauern und werden erst nach Eingang Ihrer individuellen Rezeptur frisch chargiert.",
            heroImageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1000&q=80",
            vatNumber: "CHE-412.890.123 MWST",
            leadTimeSchedule: "Röstung jeden Dienstag & Donnerstag",
            batchScheduleNotice: "Nächste Röstung: Dienstag 08:00 Uhr",
            establishedYear: 2021,
            contactEmail: "roastmaster@maelstrom.ch"
        )
        
        let aarauHops = Producer(
            id: "prod-aarau",
            name: "Aarau Hops & Grain",
            tagline: "Unfiltered Microbrews & Curated Crates",
            category: .beer,
            country: .ch,
            city: "Aarau",
            currency: "CHF",
            bio: "Unfiltrierte Biere aus dem Aargau. Wählen Sie Ihre Lieblingsstile für eine individuelle 6er-Box mit eigenem Etikett.",
            heroImageUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=1000&q=80",
            vatNumber: "CHE-298.114.772 MWST",
            leadTimeSchedule: "Abfüllung & Frischeversand wöchentlich freitags",
            batchScheduleNotice: "Frische Zapfung: Freitag",
            establishedYear: 2019,
            contactEmail: "brauerei@aarauhops.ch"
        )
        
        let cacaoBasel = Producer(
            id: "prod-cacao",
            name: "Cacao Atelier Basel",
            tagline: "Bean-to-Bar Chocolate & Grand Cru Infusions",
            category: .chocolate,
            country: .ch,
            city: "Basel",
            currency: "CHF",
            bio: "Feinste Bean-to-Bar Schokoladen mit sortenreinen Edelkakaos. Stellen Sie Kakaogehalt und Edelinversionen mit personalisierter Banderole zusammen.",
            heroImageUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=1000&q=80",
            vatNumber: "CHE-119.553.901 MWST",
            leadTimeSchedule: "Giessen dienstags, Versand mittwochs",
            batchScheduleNotice: "Giesstermin: Dienstag",
            establishedYear: 2022,
            contactEmail: "atelier@cacao-basel.ch"
        )
        
        self.producers = [maelstrom, aarauHops, cacaoBasel]
        self.selectedProducer = maelstrom
        
        // MTO Coffee Customizer
        let coffeeConfig = CustomizationConfig(
            id: "cfg-coffee",
            productId: "prod-coffee-custom",
            sliderTitle: "Bohnenmischung (100% gesperrt)",
            totalWeightGrams: 500,
            components: [
                BlendComponent(id: "c-ethiopia", name: "Äthiopien Yirgacheffe G1", origin: "2'050m / Washed", process: "Floral & Pfirsich", notes: ["Bergamotte", "Jasmin"], priceMultiplier: 1.15, hexColor: "E0A96D"),
                BlendComponent(id: "c-colombia", name: "Kolumbien Huila Supremo", origin: "1'750m / Washed", process: "Süss & Schokoladig", notes: ["Roter Apfel", "Karamell"], priceMultiplier: 1.05, hexColor: "A65335"),
                BlendComponent(id: "c-brazil", name: "Brasilien Cerrado Dulce", origin: "1'150m / Natural", process: "Nussig & Cremig", notes: ["Haselnuss", "Kakao"], priceMultiplier: 0.95, hexColor: "633A26"),
                BlendComponent(id: "c-guatemala", name: "Guatemala Antigua Pastoral", origin: "1'600m / Washed", process: "Würzig & Komplex", notes: ["Beeren", "Zimt"], priceMultiplier: 1.10, hexColor: "3F2212")
            ],
            options: [
                CustomizationOption(
                    key: "grind",
                    title: "Mahlgrad & Zubereitung",
                    defaultValue: "whole_bean",
                    values: [
                        OptionChoice(label: "Ganze Bohne (Frisch)", value: "whole_bean", priceDelta: nil),
                        OptionChoice(label: "Espresso (Siebträger)", value: "espresso", priceDelta: nil),
                        OptionChoice(label: "Bialetti (Moka)", value: "moka", priceDelta: nil),
                        OptionChoice(label: "Filter (V60 / Chemex)", value: "filter", priceDelta: nil),
                        OptionChoice(label: "French Press", value: "french_press", priceDelta: nil)
                    ]
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Julians Morning Fuel",
                maxHeadlineLength: 28,
                allowDedication: true,
                maxDedicationLength: 45,
                fixedBrandStamp: "+ SWISS CRAFT · MAELSTROM"
            )
        )
        
        // 1. Made-to-Order Produkt
        let coffeeCustom = Product(
            id: "prod-coffee-custom",
            producerId: "prod-maelstrom",
            title: "Signature Custom Blend (500g)",
            subtitle: "Kreieren Sie Ihren persönlichen Blend mit Live-Etikett",
            description: "Kombinieren Sie Single Origins per Schieberegler exakt nach Ihrem Geschmacksprofil. Wir wiegen grammgenau ein und drucken Ihr persönliches Etikett.",
            category: .coffee,
            basePrice: 22.00,
            unitText: "500g Beutel",
            weightGrams: 500,
            isCustomizable: true,
            imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80",
            tags: ["Made to Order", "Direct Trade", "Zürich"],
            config: coffeeConfig
        )
        
        // 2. Standard Produkt
        let coffeeGeisha = Product(
            id: "prod-coffee-geisha",
            producerId: "prod-maelstrom",
            title: "Panama Boquete Geisha Lot #4",
            subtitle: "Limitierte Rarität mit floralem Jasmin-Bouquet",
            description: "Sortenreiner Spitzenkaffee aus Panama mit feinen Jasmin- und Pfirsichnoten.",
            category: .coffee,
            basePrice: 34.00,
            unitText: "250g Box",
            weightGrams: 250,
            isCustomizable: false,
            stockQuantity: 42,
            imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
            tags: ["Single Origin", "Micro-Lot"],
            config: nil
        )
        
        self.products = [coffeeCustom, coffeeGeisha]
        self.activeProduct = coffeeCustom
        
        // Seed initial order
        let seedOrder = Order(
            id: "seed-1001",
            orderNumber: "ATL-2026-8801",
            producerId: "prod-maelstrom",
            producerName: "Maelstrom Roasters",
            customerName: "Julian Steiner",
            customerEmail: "julian.steiner@bluewin.ch",
            customerStreet: "Seestrasse 42",
            customerCity: "Zürich",
            customerPostalCode: "8002",
            customerCountry: .ch,
            items: [
                CartItem(
                    id: "item-1",
                    product: coffeeCustom,
                    producer: maelstrom,
                    quantity: 1,
                    unitPrice: 24.20,
                    recipe: [
                        RecipeItem(componentId: "c-ethiopia", componentName: "Äthiopien Yirgacheffe", origin: "2'050m", ratio: 60, grams: 300),
                        RecipeItem(componentId: "c-colombia", componentName: "Kolumbien Huila", origin: "1'750m", ratio: 40, grams: 200)
                    ],
                    selections: ["grind": "espresso"],
                    customLabel: CustomLabelData(
                        headline: "Julian's Morning Roast",
                        subtitle: "60% Yirgacheffe / 40% Huila",
                        dedication: "Frisch geröstet für das Atelier Zürich",
                        fontStyle: "swiss-sans",
                        batchNumber: "MZ-BATCH #441",
                        dateString: "19.08.2026"
                    )
                )
            ],
            status: .inProduction,
            totalAmount: 24.20,
            paymentMethod: "TWINT",
            createdAt: Date().addingTimeInterval(-7200),
            scheduledBatchDate: "Dienstag, 08:00 Uhr"
        )
        
        self.orders = [seedOrder]
    }
}
