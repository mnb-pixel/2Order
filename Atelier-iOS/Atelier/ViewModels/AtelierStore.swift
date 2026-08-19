import Foundation
import SwiftUI
import Combine

// Everything persisted across app launches lives in this one Codable blob —
// simpler and more atomic than many separate UserDefaults keys. Portal-unlock
// state is deliberately NOT part of it (see AtelierStore.unlockedProducerIds):
// it should behave like a session, requiring the PIN again after a cold
// launch, not survive forever like the rest of the data.
private struct PersistedState: Codable {
    var producers: [Producer]
    var products: [Product]
    var orders: [Order]
    var quotes: [Quote]
    var invoices: [Invoice]
    var cart: [CartItem]
    var myProducerIds: [String]
}

private let persistenceKey = "atelier_ios_state_v1"

class AtelierStore: ObservableObject {
    // Mode
    @Published var selectedTab: Int = 0 // 0: Discover, 1: Cart, 2: Orders, 3: Producer Portal

    // Core Data
    @Published var producers: [Producer] = []
    @Published var products: [Product] = []
    @Published var cart: [CartItem] = []
    @Published var orders: [Order] = []
    @Published var quotes: [Quote] = []
    @Published var invoices: [Invoice] = []

    // Ownership: which Gewerbe belong to the current user, as opposed to the
    // wider marketplace of other manufacturers visible while browsing.
    @Published var myProducerIds: [String] = []

    // Portal-unlock state — intentionally in-memory only (see PersistedState).
    @Published var unlockedProducerIds: Set<String> = []

    // Active Navigation State
    @Published var selectedProducer: Producer?
    @Published var activeProduct: Product?
    @Published var activeOrder: Order?
    @Published var activeQuote: Quote?

    // Feedback Generator
    private let hapticImpact = UIImpactFeedbackGenerator(style: .medium)
    private let hapticSuccess = UINotificationFeedbackGenerator()

    init() {
        if !loadPersistedState() {
            loadSeedData()
        }
    }

    func triggerHapticFeedback() {
        hapticImpact.impactOccurred()
    }

    func triggerSuccessFeedback() {
        hapticSuccess.notificationOccurred(.success)
    }

    // MARK: - Persistence
    // Called explicitly at the end of every mutating method below (rather
    // than via a reactive Combine pipeline) so persistence timing stays
    // simple and predictable.
    private func persist() {
        let state = PersistedState(
            producers: producers, products: products, orders: orders,
            quotes: quotes, invoices: invoices, cart: cart, myProducerIds: myProducerIds
        )
        guard let data = try? JSONEncoder().encode(state) else { return }
        UserDefaults.standard.set(data, forKey: persistenceKey)
    }

    /// Returns true if a previously saved state was found and restored.
    private func loadPersistedState() -> Bool {
        guard let data = UserDefaults.standard.data(forKey: persistenceKey),
              let state = try? JSONDecoder().decode(PersistedState.self, from: data),
              !state.producers.isEmpty else {
            return false
        }
        producers = state.producers
        products = state.products
        orders = state.orders
        quotes = state.quotes
        invoices = state.invoices
        cart = state.cart
        myProducerIds = state.myProducerIds
        selectedProducer = producers.first { $0.id == myProducerIds.first } ?? producers.first
        activeProduct = products.first
        return true
    }

    // MARK: - Producer Management
    @discardableResult
    func createProducer(name: String, category: CraftCategory, city: String, country: DACHCountry, tagline: String, vatNumber: String, leadTimeSchedule: String, portalPin: String) -> Producer {
        let newProd = Producer(
            id: "prod-\(Date().timeIntervalSince1970)",
            name: name,
            tagline: tagline,
            category: category,
            country: country,
            city: city,
            currency: country.currency,
            bio: "Handwerkliche Manufaktur mit Made-to-Order Produktion.",
            heroImageUrl: "coffee_roastery_hero",
            vatNumber: vatNumber,
            leadTimeSchedule: leadTimeSchedule,
            batchScheduleNotice: "Wöchentliche Frischecharge",
            establishedYear: Calendar.current.component(.year, from: Date()),
            contactEmail: "kontakt@\(name.lowercased().replacingOccurrences(of: " ", with: "")).ch",
            capacityPerBatch: nil,
            portalPin: portalPin
        )
        producers.append(newProd)
        myProducerIds.append(newProd.id)
        unlockedProducerIds.insert(newProd.id) // the creator just chose this PIN themselves
        selectedProducer = newProd
        triggerSuccessFeedback()
        persist()
        return newProd
    }

    func updateProducer(_ id: String, _ mutate: (inout Producer) -> Void) {
        guard let idx = producers.firstIndex(where: { $0.id == id }) else { return }
        mutate(&producers[idx])
        if selectedProducer?.id == id { selectedProducer = producers[idx] }
        persist()
    }

    // MARK: - Portal Access Gate
    // Lightweight, client-side deterrent — not real authentication. See the
    // caveat on Producer.portalPin.
    func isPortalUnlocked(_ producerId: String) -> Bool {
        unlockedProducerIds.contains(producerId)
    }

    @discardableResult
    func unlockPortal(_ producerId: String, pin: String) -> Bool {
        guard let producer = producers.first(where: { $0.id == producerId }),
              !pin.isEmpty, producer.portalPin == pin else {
            return false
        }
        unlockedProducerIds.insert(producerId)
        return true
    }

    // MARK: - Cart Methods
    func addToCart(_ item: CartItem) {
        cart.append(item)
        triggerSuccessFeedback()
        persist()
    }

    func removeFromCart(at offsets: IndexSet) {
        cart.remove(atOffsets: offsets)
        triggerHapticFeedback()
        persist()
    }

    func clearCart() {
        cart.removeAll()
        persist()
    }

    var cartTotal: Double {
        cart.reduce(0) { $0 + $1.totalPrice }
    }

    var cartRequiresQuote: Bool {
        cart.contains { $0.product.transactionMode == .quoteRequest }
    }

    // MARK: - Checkout & Order Creation
    @discardableResult
    func createOrder(customer: CustomerDetails, fulfillmentType: FulfillmentType, paymentMethod: String, isGift: Bool = false, giftMessage: String = "") -> Order {
        let producer = cart.first?.producer ?? producers[0]
        let orderNum = "ATL-2026-\(Int.random(in: 1000...9999))"
        let totals = calculateOrderTotals(grossTotal: cartTotal, country: customer.country)

        let newOrder = Order(
            id: UUID().uuidString,
            orderNumber: orderNum,
            producerId: producer.id,
            producerName: producer.name,
            customer: customer,
            items: cart,
            status: .paid,
            fulfillmentType: fulfillmentType,
            subtotal: totals.subtotal,
            taxRate: totals.taxRate,
            taxAmount: totals.taxAmount,
            totalAmount: totals.total,
            paymentMethod: paymentMethod,
            createdAt: Date(),
            scheduledBatchDate: "Dienstag, 08:00 Uhr",
            isGift: isGift,
            giftMessage: giftMessage
        )

        deductStock(for: cart)
        orders.insert(newOrder, at: 0)
        activeOrder = newOrder
        cart.removeAll()
        triggerSuccessFeedback()
        persist()
        return newOrder
    }

    func updateOrderStatus(orderId: String, newStatus: OrderStatus) {
        if let index = orders.firstIndex(where: { $0.id == orderId }) {
            orders[index].status = newStatus
            triggerHapticFeedback()
            persist()
        }
    }

    func getBatchCapacityInfo(producerId: String) -> (capacity: Int?, booked: Int, isFull: Bool) {
        guard let capacity = producers.first(where: { $0.id == producerId })?.capacityPerBatch else {
            return (nil, 0, false)
        }
        let booked = orders.filter {
            $0.producerId == producerId && ($0.status == .paid || $0.status == .inProduction)
        }.count
        return (capacity, booked, booked >= capacity)
    }

    // Deducts component/product stock when an order is placed, so a sold-out
    // ingredient or a standard product at 0 units can't silently be oversold.
    private func deductStock(for items: [CartItem]) {
        for item in items {
            if let recipe = item.recipe, let config = item.product.config {
                var updatedConfig = config
                for r in recipe {
                    guard let compIdx = updatedConfig.components.firstIndex(where: { $0.id == r.componentId }),
                          let currentStock = updatedConfig.components[compIdx].stockQuantity else { continue }
                    let used = r.grams * item.quantity
                    let remaining = max(0, currentStock - used)
                    updatedConfig.components[compIdx].stockQuantity = remaining
                    if remaining <= 0 { updatedConfig.components[compIdx].inStock = false }
                }
                if let prodIdx = products.firstIndex(where: { $0.id == item.product.id }) {
                    products[prodIdx].config = updatedConfig
                }
            } else if !item.product.isCustomizable, let stock = item.product.stockQuantity,
                      let prodIdx = products.firstIndex(where: { $0.id == item.product.id }) {
                products[prodIdx].stockQuantity = max(0, stock - item.quantity)
            }
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
        persist()
    }

    // MARK: - Quote / Offerte -> Rechnung flow. The platform only stores the
    // negotiation + invoice reference — money always moves directly between
    // customer and producer.
    @discardableResult
    func createQuoteRequest(items: [QuoteItem], customer: CustomerDetails, producer: Producer, customerNote: String) -> Quote {
        let quote = Quote(
            id: UUID().uuidString,
            quoteNumber: "OFF-2026-\(Int.random(in: 1000...9999))",
            producerId: producer.id,
            producerName: producer.name,
            customer: customer,
            items: items,
            customerNote: customerNote,
            status: .requested,
            quotedPrice: nil,
            quotedNote: nil,
            createdAt: Date()
        )
        quotes.insert(quote, at: 0)
        activeQuote = quote
        triggerSuccessFeedback()
        persist()
        return quote
    }

    func respondToQuote(quoteId: String, price: Double, note: String) {
        guard let idx = quotes.firstIndex(where: { $0.id == quoteId }) else { return }
        quotes[idx].status = .quoted
        quotes[idx].quotedPrice = price
        quotes[idx].quotedNote = note
        triggerHapticFeedback()
        persist()
    }

    /// Customer accepts the producer's offer. This only records intent — the
    /// producer still has to issue the actual invoice (issueInvoice below).
    func acceptQuote(quoteId: String) {
        guard let idx = quotes.firstIndex(where: { $0.id == quoteId }) else { return }
        quotes[idx].status = .accepted
        triggerSuccessFeedback()
        persist()
    }

    func declineQuote(quoteId: String) {
        guard let idx = quotes.firstIndex(where: { $0.id == quoteId }) else { return }
        quotes[idx].status = .declined
        triggerHapticFeedback()
        persist()
    }

    /// Producer issues the invoice for an accepted quote (e.g. as a Swiss-QR-Rechnung).
    @discardableResult
    func issueInvoice(quoteId: String) -> Invoice? {
        guard let idx = quotes.firstIndex(where: { $0.id == quoteId }) else { return nil }
        quotes[idx].status = .invoiced
        let quote = quotes[idx]
        let invoice = Invoice(
            id: UUID().uuidString,
            invoiceNumber: "RE-2026-\(Int.random(in: 1000...9999))",
            quoteId: quoteId,
            producerId: quote.producerId,
            amount: quote.quotedPrice ?? 0,
            dueDate: DateFormatter.localizedString(from: Date().addingTimeInterval(30 * 86400), dateStyle: .medium, timeStyle: .none),
            qrReference: generateQrReference(seq: invoices.count + 1),
            status: "open",
            createdAt: Date()
        )
        invoices.insert(invoice, at: 0)
        triggerSuccessFeedback()
        persist()
        return invoice
    }

    func markInvoicePaid(invoiceId: String) {
        guard let idx = invoices.firstIndex(where: { $0.id == invoiceId }) else { return }
        invoices[idx].status = "paid"
        if let quoteIdx = quotes.firstIndex(where: { $0.id == invoices[idx].quoteId }) {
            quotes[quoteIdx].status = .paid
        }
        triggerSuccessFeedback()
        persist()
    }

    private func generateQrReference(seq: Int) -> String {
        // Swiss-QR-Rechnung-style structured reference — simplified for
        // prototype purposes, not a certified ISO 20022 QR-IBAN reference.
        let base = String(format: "%026d", Int(Date().timeIntervalSince1970 * 1000) + seq).suffix(26)
        let table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
        var carry = 0
        for ch in base {
            if let digit = ch.wholeNumberValue {
                carry = table[(carry + digit) % 10]
            }
        }
        let checkDigit = (10 - carry) % 10
        return "\(base)\(checkDigit)"
    }

    // MARK: - Seed Data Loader (All 5 Swiss Craft Producers)
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
            heroImageUrl: "coffee_roastery_hero",
            vatNumber: "CHE-412.890.123 MWST",
            leadTimeSchedule: "Röstung jeden Dienstag & Donnerstag",
            batchScheduleNotice: "Nächste Röstung: Dienstag 08:00 Uhr",
            establishedYear: 2021,
            contactEmail: "roastmaster@maelstrom.ch",
            capacityPerBatch: 40,
            portalPin: "1001"
        )

        let aarauHops = Producer(
            id: "prod-aarau-hops",
            name: "Aarau Hops & Grain",
            tagline: "Unfiltered Microbrews & Curated Crates",
            category: .beer,
            country: .ch,
            city: "Aarau",
            currency: "CHF",
            bio: "Unfiltrierte Biere aus dem Aargau. Wählen Sie Ihre Lieblingsstile für eine individuelle 6er-Box mit eigenem Etikett.",
            heroImageUrl: "craft_brewery_hero",
            vatNumber: "CHE-298.114.772 MWST",
            leadTimeSchedule: "Abfüllung & Frischeversand wöchentlich freitags",
            batchScheduleNotice: "Frische Zapfung: Freitag",
            establishedYear: 2019,
            contactEmail: "brauerei@aarauhops.ch",
            capacityPerBatch: 25,
            portalPin: "1002"
        )

        let cacaoBasel = Producer(
            id: "prod-cacao-basel",
            name: "Cacao Atelier Basel",
            tagline: "Bean-to-Bar Chocolate & Grand Cru Infusions",
            category: .chocolate,
            country: .ch,
            city: "Basel",
            currency: "CHF",
            bio: "Feinste Bean-to-Bar Schokoladen mit sortenreinen Edelkakaos. Stellen Sie Kakaogehalt und Edelinversionen mit personalisierter Banderole zusammen.",
            heroImageUrl: "chocolate_atelier_hero",
            vatNumber: "CHE-119.553.901 MWST",
            leadTimeSchedule: "Giessen dienstags, Versand mittwochs",
            batchScheduleNotice: "Giesstermin: Dienstag",
            establishedYear: 2022,
            contactEmail: "atelier@cacao-basel.ch",
            capacityPerBatch: 30,
            portalPin: "1003"
        )

        let gelatoBern = Producer(
            id: "prod-gletscher-gelato",
            name: "Gletscher Gelato Bern",
            tagline: "Artisan Gelato · Kugel für Kugel frisch zusammengestellt",
            category: .iceCream,
            country: .ch,
            city: "Bern",
            currency: "CHF",
            bio: "Täglich frisch gerührtes Gelato aus Berner Bergmilch. Stellen Sie Ihren eigenen Becher aus unseren Sorten zusammen — nur zur Abholung.",
            heroImageUrl: "gelato_hero",
            vatNumber: "CHE-330.774.221 MWST",
            leadTimeSchedule: "Täglich frisch gerührt, Abholung ab 11:00",
            batchScheduleNotice: "Heutige Rührung bereit ab 11:00 Uhr",
            establishedYear: 2023,
            contactEmail: "ciao@gletscher-gelato.ch",
            capacityPerBatch: 60,
            portalPin: "1004"
        )

        let zopfZeit = Producer(
            id: "prod-zopf-zeit",
            name: "Bäckerei Zopf & Zeit",
            tagline: "Konditorei & Sauerteig-Atelier für Anlass-Torten",
            category: .bakery,
            country: .ch,
            city: "Luzern",
            currency: "CHF",
            bio: "Handgefertigte Torten und Festgebäck für besondere Anlässe. Jede Torte wird als meisterhaftes Einzelstück nach Ihren Wünschen gefertigt.",
            heroImageUrl: "bakery_hero",
            vatNumber: "CHE-401.882.556 MWST",
            leadTimeSchedule: "Vorlaufzeit mind. 5 Werktage ab Offertannahme",
            batchScheduleNotice: "Backtag nach Vereinbarung",
            establishedYear: 2018,
            contactEmail: "atelier@zopf-zeit.ch",
            capacityPerBatch: nil,
            portalPin: "1005"
        )

        self.producers = [maelstrom, aarauHops, cacaoBasel, gelatoBern, zopfZeit]
        self.selectedProducer = maelstrom
        self.myProducerIds = ["prod-maelstrom"]
        self.unlockedProducerIds = []

        // MTO Coffee Customizer (recipe_blend, all 4 origins currently in stock)
        let coffeeConfig = CustomizationConfig(
            id: "cfg-coffee",
            productId: "prod-coffee-custom-blend",
            archetype: .recipeBlend,
            sliderTitle: "Bohnenmischung (100% gesperrt)",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 500,
            components: [
                BlendComponent(id: "c-ethiopia", name: "Äthiopien Yirgacheffe G1", origin: "2'050m / Washed", process: "Floral & Pfirsich", notes: ["Bergamotte", "Jasmin"], priceMultiplier: 1.15, hexColor: "E0A96D", maxRatio: 100, inStock: true, stockQuantity: 8000, allergens: []),
                BlendComponent(id: "c-colombia", name: "Kolumbien Huila Supremo", origin: "1'750m / Washed", process: "Süss & Schokoladig", notes: ["Roter Apfel", "Karamell"], priceMultiplier: 1.05, hexColor: "A65335", maxRatio: 100, inStock: true, stockQuantity: 6500, allergens: []),
                BlendComponent(id: "c-brazil", name: "Brasilien Cerrado Dulce", origin: "1'150m / Natural", process: "Nussig & Cremig", notes: ["Haselnuss", "Kakao"], priceMultiplier: 0.95, hexColor: "633A26", maxRatio: 100, inStock: true, stockQuantity: 9200, allergens: []),
                BlendComponent(id: "c-guatemala", name: "Guatemala Antigua Pastoral", origin: "1'600m / Washed", process: "Würzig & Komplex", notes: ["Beeren", "Zimt"], priceMultiplier: 1.10, hexColor: "3F2212", maxRatio: 100, inStock: true, stockQuantity: 350, allergens: [])
            ],
            options: [
                CustomizationOption(
                    key: "grind",
                    title: "Mahlgrad & Zubereitung",
                    defaultValue: "whole_bean",
                    isRequired: true,
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

        let coffeeCustom = Product(
            id: "prod-coffee-custom-blend",
            producerId: "prod-maelstrom",
            title: "Signature Custom Coffee Blend (500g)",
            subtitle: "Kreieren Sie Ihren persönlichen Blend mit Live-Etikett",
            description: "Kombinieren Sie Single Origins per Schieberegler exakt nach Ihrem Geschmacksprofil. Wir wiegen grammgenau ein und drucken Ihr persönliches Etikett.",
            category: .coffee,
            basePrice: 22.00,
            unitText: "500g Beutel",
            weightGrams: 500,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "coffee_custom_blend",
            tags: ["Made to Order", "Direct Trade", "Zürich"],
            config: coffeeConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: []
        )

        let coffeeGeisha = Product(
            id: "prod-coffee-standard-geisha",
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
            imageUrl: "coffee_roastery_hero",
            tags: ["Single Origin", "Micro-Lot"],
            config: nil,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: []
        )

        // Craft Beer Custom Box (build_a_box) — "Altstadt Smoked Porter" is
        // seeded already sold out, the same scenario the web app's fix for
        // out-of-stock components in the ratio distribution guards against.
        let beerConfig = CustomizationConfig(
            id: "cfg-beer-box",
            productId: "prod-beer-custom-box",
            archetype: .buildABox,
            sliderTitle: "Flaschenauswahl für 6er-Box",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 1980,
            components: [
                BlendComponent(id: "b-hazy", name: "Aare Hazy Double IPA (7.2%)", origin: "Citra Dry Hop", process: "Fruchtig & trüb", notes: ["Maracuja", "Grapefruit"], priceMultiplier: 1.12, hexColor: "EBB344", maxRatio: 100, inStock: true, stockQuantity: 180, allergens: [.gluten]),
                BlendComponent(id: "b-pale", name: "Kettenbrücke Session Pale (4.8%)", origin: "Hallertau Blanc", process: "Leicht & frisch", notes: ["Stachelbeere", "Frisch"], priceMultiplier: 0.95, hexColor: "F4D06F", maxRatio: 100, inStock: true, stockQuantity: 240, allergens: [.gluten]),
                BlendComponent(id: "b-sour", name: "Jura Wild Sour Cherry (5.5%)", origin: "Sauerkirschen", process: "Säuerlich & trocken", notes: ["Fruchtsäure", "Trocken"], priceMultiplier: 1.20, hexColor: "9C2E35", maxRatio: 100, inStock: true, stockQuantity: 90, allergens: [.gluten, .sulfites]),
                BlendComponent(id: "b-porter", name: "Altstadt Smoked Porter (6.8%)", origin: "Rauchmalz", process: "Rauchig & dunkel", notes: ["Bitterschokolade", "Rauch"], priceMultiplier: 1.05, hexColor: "261C14", maxRatio: 100, inStock: true, stockQuantity: 0, allergens: [.gluten])
            ],
            options: [
                CustomizationOption(
                    key: "packaging",
                    title: "Verpackungsausführung",
                    defaultValue: "kraft",
                    isRequired: true,
                    values: [
                        OptionChoice(label: "Design Kraftkarton Box", value: "kraft", priceDelta: 0),
                        OptionChoice(label: "Rustikale Schweizer Holzkiste (+ CHF 8.00)", value: "wood", priceDelta: 8.0)
                    ]
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Summer Solstice Sud #08",
                maxHeadlineLength: 25,
                allowDedication: true,
                maxDedicationLength: 40,
                fixedBrandStamp: "+ SWISS CRAFT · AARAU HOPS"
            )
        )

        let beerBox = Product(
            id: "prod-beer-custom-box",
            producerId: "prod-aarau-hops",
            title: "Curated 6er Craft Beer Flight & Custom Label",
            subtitle: "Stellen Sie Ihre 6 Lieblingsflaschen zusammen",
            description: "Wählen Sie die 6 Flaschen Ihrer Box aus unseren frisch gebrauten Suden. Inklusive individuellem Flaschenetikett.",
            category: .beer,
            basePrice: 28.50,
            unitText: "6x 330ml Box",
            weightGrams: 1980,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "craft_beer_box",
            tags: ["Craft Beer", "Unfiltriert", "Aargau"],
            config: beerConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: []
        )

        let chocolateBar = Product(
            id: "prod-chocolate-bar-custom",
            producerId: "prod-cacao-basel",
            title: "Grand Cru Schokoladentafel (100g)",
            subtitle: "Bean-to-Bar Grand Cru mit Banderole",
            description: "Sortenreine Edelschokolade mit traditioneller Walzung und Kakaobruch-Inklusionen.",
            category: .chocolate,
            basePrice: 12.50,
            unitText: "100g Tafel",
            weightGrams: 100,
            isCustomizable: false,
            stockQuantity: 65,
            imageUrl: "chocolate_bar_custom",
            tags: ["Bean-to-Bar", "Grand Cru"],
            config: nil,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: [.milk, .soy]
        )

        // Build-Your-Own Gelato (build_a_box, pickup only)
        let gelatoConfig = CustomizationConfig(
            id: "cfg-gelato-cup",
            productId: "prod-gelato-cup",
            archetype: .buildABox,
            sliderTitle: "Kugelauswahl (max. 3 Kugeln inklusive)",
            targetTotal: 3,
            targetUnit: "Kugeln",
            totalWeightGrams: 240,
            components: [
                BlendComponent(id: "g-pistazie", name: "Sizilianische Pistazie", origin: "", process: "Nussig & cremig", notes: ["Nussig", "Cremig"], priceMultiplier: 1.1, hexColor: "9CAF6B", maxRatio: 3, inStock: true, stockQuantity: 40, allergens: [.milk, .nuts]),
                BlendComponent(id: "g-fragola", name: "Fragola di Bosco (Walderdbeere)", origin: "", process: "Fruchtig & vegan", notes: ["Fruchtig", "Vegan"], priceMultiplier: 1.0, hexColor: "C94F5C", maxRatio: 3, inStock: true, stockQuantity: 55, allergens: []),
                BlendComponent(id: "g-stracciatella", name: "Stracciatella", origin: "", process: "Cremig mit Schokosplittern", notes: ["Cremig", "Schokosplitter"], priceMultiplier: 1.05, hexColor: "F4F1E8", maxRatio: 3, inStock: true, stockQuantity: 60, allergens: [.milk])
            ],
            options: [
                CustomizationOption(
                    key: "topping",
                    title: "Topping",
                    defaultValue: "none",
                    isRequired: false,
                    values: [
                        OptionChoice(label: "Ohne Topping", value: "none", priceDelta: 0),
                        OptionChoice(label: "Geröstete Haselnüsse", value: "hazelnut", priceDelta: 1.0, allergens: [.nuts]),
                        OptionChoice(label: "Schokoladensauce", value: "chocolate", priceDelta: 1.0, allergens: [.milk, .soy])
                    ]
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Sommerabend Special",
                maxHeadlineLength: 24,
                allowDedication: false,
                maxDedicationLength: 0,
                fixedBrandStamp: "+ SWISS CRAFT · GLETSCHER GELATO"
            )
        )

        let gelatoCup = Product(
            id: "prod-gelato-cup",
            producerId: "prod-gletscher-gelato",
            title: "Build-Your-Own Gelato Becher",
            subtitle: "Kugeln & Toppings frei kombinieren",
            description: "Tagesfrisches Gelato aus Berner Alpenmilch. Nur zur Abholung, damit alles perfekt gefroren bleibt.",
            category: .iceCream,
            basePrice: 6.50,
            unitText: "Becher (3 Kugeln)",
            weightGrams: 240,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "gelato_hero",
            tags: ["Tagesfrisch", "Abholung"],
            config: gelatoConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .pickupOnly,
            allergens: []
        )

        // Bespoke bakery product — quote-request only, no configurator.
        let bakeryCake = Product(
            id: "prod-bakery-cake",
            producerId: "prod-zopf-zeit",
            title: "Anlass-Torte & Festgebäck nach Mass",
            subtitle: "Individuelle Offerte für Ihre Feier",
            description: "Jede Torte wird als Einzelstück nach Ihren Vorgaben gebacken. Senden Sie uns eine Anfrage — wir melden uns mit einer persönlichen Offerte.",
            category: .bakery,
            basePrice: 0, // no fixed price — the producer prices it individually per offer
            unitText: "Torte (8-16 Pers.)",
            weightGrams: 1200,
            isCustomizable: false,
            stockQuantity: nil,
            imageUrl: "bakery_hero",
            tags: ["Festtorte", "Konditorei", "Nur auf Anfrage"],
            config: nil,
            transactionMode: .quoteRequest,
            shippingRestriction: .pickupOnly,
            allergens: [.gluten, .eggs, .milk]
        )

        self.products = [coffeeCustom, coffeeGeisha, beerBox, chocolateBar, gelatoCup, bakeryCake]
        self.activeProduct = coffeeCustom

        // Seed initial order
        let seedOrder = Order(
            id: "seed-1001",
            orderNumber: "ATL-2026-8801",
            producerId: "prod-maelstrom",
            producerName: "Maelstrom Roasters",
            customer: CustomerDetails(name: "Julian Steiner", email: "julian.steiner@bluewin.ch", street: "Seestrasse 42", postalCode: "8002", city: "Zürich", country: .ch),
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
            fulfillmentType: .shipping,
            subtotal: 24.20,
            taxRate: DACHCountry.ch.vatRate,
            taxAmount: 24.20 * (DACHCountry.ch.vatRate / (1 + DACHCountry.ch.vatRate)),
            totalAmount: 24.20,
            paymentMethod: "TWINT",
            createdAt: Date().addingTimeInterval(-7200),
            scheduledBatchDate: "Dienstag, 08:00 Uhr"
        )

        self.orders = [seedOrder]
    }
}
