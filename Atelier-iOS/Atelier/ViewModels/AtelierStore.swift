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

private let persistenceKey = "atelier_ios_state_v2"

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
    func createQuoteRequest(
        items: [QuoteItem],
        customer: CustomerDetails,
        producer: Producer,
        customerNote: String,
        selectedTasteTags: [String]? = nil,
        bespokeDescription: String? = nil,
        customFieldValues: [String: String]? = nil
    ) -> Quote {
        let quote = Quote(
            id: UUID().uuidString,
            quoteNumber: "OFF-2026-\(Int.random(in: 1000...9999))",
            producerId: producer.id,
            producerName: producer.name,
            customer: customer,
            items: items,
            customerNote: customerNote,
            selectedTasteTags: selectedTasteTags,
            bespokeDescription: bespokeDescription,
            customFieldValues: customFieldValues,
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

    /// Customer accepts the producer's offer.
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

    /// Producer issues the invoice for an accepted quote.
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

    // MARK: - Producer Dynamic Config Management
    func addCustomField(to productId: String, field: CustomField) {
        guard let idx = products.firstIndex(where: { $0.id == productId }),
              var cfg = products[idx].config else { return }
        cfg.customFields.append(field)
        products[idx].config = cfg
        triggerSuccessFeedback()
        persist()
    }

    func removeCustomField(from productId: String, fieldId: String) {
        guard let idx = products.firstIndex(where: { $0.id == productId }),
              var cfg = products[idx].config else { return }
        cfg.customFields.removeAll { $0.id == fieldId }
        products[idx].config = cfg
        triggerHapticFeedback()
        persist()
    }

    func updateProductMaxComponents(productId: String, maxComponents: Int?) {
        guard let idx = products.firstIndex(where: { $0.id == productId }),
              var cfg = products[idx].config else { return }
        cfg.maxSelectableComponents = maxComponents
        products[idx].config = cfg
        persist()
    }

    private func generateQrReference(seq: Int) -> String {
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

    // MARK: - Seed Data Loader (All 8 Swiss Craft Producers & Products)
    private func loadSeedData() {
        // 1. Rösterei
        let maelstrom = Producer(
            id: "prod-maelstrom",
            name: "Maelstrom Roasters",
            tagline: "Specialty Coffee & On-Demand Micro-Roasting",
            category: .coffee,
            country: .ch,
            city: "Zürich",
            currency: "CHF",
            bio: "Wir rösten handwerkliche Kaffeespezialitäten in Zürich-West. Wählen Sie bis zu 3 Bohnenherkünfte und bestimmen Sie Röstgrad und Mahlung für Ihre persönliche Röstcharge.",
            heroImageUrl: "coffee_roastery_hero",
            vatNumber: "CHE-412.890.123 MWST",
            leadTimeSchedule: "Röstung jeden Dienstag & Donnerstag",
            batchScheduleNotice: "Nächste Röstung: Dienstag 08:00 Uhr",
            establishedYear: 2021,
            contactEmail: "roastmaster@maelstrom.ch",
            capacityPerBatch: 40,
            portalPin: "1001"
        )

        // 2. Brauerei
        let aarauHops = Producer(
            id: "prod-aarau-hops",
            name: "Aarau Hops & Grain",
            tagline: "Unfiltered Microbrews & Curated Crates",
            category: .beer,
            country: .ch,
            city: "Aarau",
            currency: "CHF",
            bio: "Unfiltrierte Craft-Biere aus dem Aargau. Stellen Sie Ihre individuelle 6er-Box zusammen oder fragen Sie einen exklusiven Sondersud für Ihren Anlass an.",
            heroImageUrl: "craft_brewery_hero",
            vatNumber: "CHE-298.114.772 MWST",
            leadTimeSchedule: "Abfüllung & Frischeversand wöchentlich freitags",
            batchScheduleNotice: "Frische Zapfung: Freitag",
            establishedYear: 2019,
            contactEmail: "brauerei@aarauhops.ch",
            capacityPerBatch: 25,
            portalPin: "1002"
        )

        // 3. Chocolatier
        let cacaoBasel = Producer(
            id: "prod-cacao-basel",
            name: "Cacao Atelier Basel",
            tagline: "Bean-to-Bar Chocolate & Grand Cru Infusions",
            category: .chocolate,
            country: .ch,
            city: "Basel",
            currency: "CHF",
            bio: "Feinste Bean-to-Bar Schokoladen mit sortenreinen Edelkakaos. Bestimmen Sie den Kakaogehalt per Schieberegler und wählen Sie handwerklich eingearbeitete Edelinversionen.",
            heroImageUrl: "chocolate_atelier_hero",
            vatNumber: "CHE-119.553.901 MWST",
            leadTimeSchedule: "Giessen dienstags, Versand mittwochs",
            batchScheduleNotice: "Giesstermin: Dienstag",
            establishedYear: 2022,
            contactEmail: "atelier@cacao-basel.ch",
            capacityPerBatch: 30,
            portalPin: "1003"
        )

        // 4. Eismanufaktur
        let gelatoBern = Producer(
            id: "prod-gletscher-gelato",
            name: "Gletscher Gelato Bern",
            tagline: "Artisan Gelato · Freier Geschmacksmix & Eigenkreationen",
            category: .iceCream,
            country: .ch,
            city: "Bern",
            currency: "CHF",
            bio: "Täglich frisch gerührtes Gelato und Fruchtsorbets aus Berner Bergmilch. Mischen Sie freie Aromenkombinationen im 500ml-Pint oder fragen Sie eine massgeschneiderte Eigenkreation an.",
            heroImageUrl: "gelato_hero",
            vatNumber: "CHE-330.774.221 MWST",
            leadTimeSchedule: "Täglich frisch gerührt, Abholung ab 11:00",
            batchScheduleNotice: "Heutige Rührung bereit ab 11:00 Uhr",
            establishedYear: 2023,
            contactEmail: "ciao@gletscher-gelato.ch",
            capacityPerBatch: 60,
            portalPin: "1004"
        )

        // 5. Bäckerei
        let zopfZeit = Producer(
            id: "prod-zopf-zeit",
            name: "Bäckerei Zopf & Zeit",
            tagline: "Konditorei & Sauerteig-Atelier für Anlass-Torten",
            category: .bakery,
            country: .ch,
            city: "Luzern",
            currency: "CHF",
            bio: "Handgefertigte Torten und Festgebäck für besondere Anlässe. Jede Torte wird als meisterhaftes Einzelstück nach Ihren Wünschen und Geschmacksvorlieben gefertigt.",
            heroImageUrl: "bakery_hero",
            vatNumber: "CHE-401.882.556 MWST",
            leadTimeSchedule: "Vorlaufzeit mind. 5 Werktage ab Offertannahme",
            batchScheduleNotice: "Backtag nach Vereinbarung",
            establishedYear: 2018,
            contactEmail: "atelier@zopf-zeit.ch",
            capacityPerBatch: nil,
            portalPin: "1005"
        )

        // 6. Destillerie
        let matterDistillers = Producer(
            id: "prod-matter-distillers",
            name: "Distillerie Matter & Geist",
            tagline: "Handcrafted Botanical Spirits & Small-Batch Gin",
            category: .spirits,
            country: .ch,
            city: "Kallnach / Bern",
            currency: "CHF",
            bio: "Historische Kupferkessel-Destillerie. Kreieren Sie Ihren persönlichen Botanical Spirit aus handverlesenen Alpenkräutern, Wacholder und Zitrusfrüchten mit individueller Trinkstärke.",
            heroImageUrl: "craft_brewery_hero",
            vatNumber: "CHE-105.882.331 MWST",
            leadTimeSchedule: "Brennen mittwochs, Abfüllung freitags",
            batchScheduleNotice: "Nächster Brand: Mittwoch",
            establishedYear: 2017,
            contactEmail: "stillmaster@matter-geist.ch",
            capacityPerBatch: 20,
            portalPin: "1006"
        )

        // 7. Teemanufaktur
        let engadinTea = Producer(
            id: "prod-engadin-tea",
            name: "Engadin Tee Atelier",
            tagline: "Alpine Wildkräuter & Grand Cru Teeblends",
            category: .tea,
            country: .ch,
            city: "St. Moritz",
            currency: "CHF",
            bio: "Handgepflückte Schweizer Alpenkräuter kombiniert mit sortenreinen Bio-Tees. Stellen Sie Ihre individuelle Teemischung mit persönlicher Dosenbeschriftung zusammen.",
            heroImageUrl: "gelato_hero",
            vatNumber: "CHE-229.441.902 MWST",
            leadTimeSchedule: "Mischen & Wiegen donnerstags",
            batchScheduleNotice: "Wöchentliche Mischung: Donnerstag",
            establishedYear: 2020,
            contactEmail: "atelier@engadin-tea.ch",
            capacityPerBatch: 35,
            portalPin: "1007"
        )

        // 8. Feinkost & Gewürze
        let ticinoGusto = Producer(
            id: "prod-ticino-gusto",
            name: "Ticino Gusto Manufaktur",
            tagline: "Artisan Kräutersalze, Pfefferblends & Würzöle",
            category: .deli,
            country: .ch,
            city: "Lugano",
            currency: "CHF",
            bio: "Mediterrane Kräuter und sonnengetrocknete Gewürze aus dem Tessin. Mischen Sie Ihr Würzsalz nach individuellem Schärfegrad und Aromaprofil.",
            heroImageUrl: "bakery_hero",
            vatNumber: "CHE-380.119.447 MWST",
            leadTimeSchedule: "Mahlung & Abfüllung dienstags",
            batchScheduleNotice: "Frische Mahlung: Dienstag",
            establishedYear: 2016,
            contactEmail: "gusto@ticino-feinkost.ch",
            capacityPerBatch: 50,
            portalPin: "1008"
        )

        self.producers = [maelstrom, aarauHops, cacaoBasel, gelatoBern, zopfZeit, matterDistillers, engadinTea, ticinoGusto]
        self.selectedProducer = maelstrom
        self.myProducerIds = ["prod-maelstrom", "prod-gletscher-gelato"]
        self.unlockedProducerIds = []

        // MARK: - Products & Configs

        // 1. ☕ COFFEE: MTO Blend (max. 3 Single Origins, Röstgrad-Slider, Mahlgrad)
        let coffeeConfig = CustomizationConfig(
            id: "cfg-coffee",
            productId: "prod-coffee-custom-blend",
            archetype: .recipeBlend,
            sliderTitle: "Bohnenherkunft (max. 3 Sorten wählbar)",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 500,
            maxSelectableComponents: 3,
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
            customFields: [
                CustomField(
                    id: "cf-coffee-roast",
                    key: "roast_level",
                    title: "Röstgrad & Röstprofil",
                    subtitle: "Bestimmt Säure, Körper und Karamellisierung der Bohnen",
                    fieldType: .slider(
                        min: 1, max: 4, step: 1, unit: "", defaultValue: 2,
                        labels: [
                            SliderLabel(value: 1, label: "Hell (Nordic / Filter)"),
                            SliderLabel(value: 2, label: "Medium (Omniroast)"),
                            SliderLabel(value: 3, label: "Medium-Dark (Full City)"),
                            SliderLabel(value: 4, label: "Dunkel (Italian Espresso)")
                        ]
                    ),
                    isRequired: true,
                    order: 0
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Julians Morning Fuel",
                maxHeadlineLength: 28,
                allowDedication: true,
                maxDedicationLength: 45,
                fixedBrandStamp: "+ SWISS CRAFT · MAELSTROM"
            ),
            allowsBespokeQuoteRequest: false
        )

        let coffeeCustom = Product(
            id: "prod-coffee-custom-blend",
            producerId: "prod-maelstrom",
            title: "Signature Custom Coffee Blend (500g)",
            subtitle: "Bohnenmix (max. 3 Herkünfte) & Röstgrad individuell definieren",
            description: "Kombinieren Sie bis zu 3 Single Origins per Schieberegler und wählen Sie Ihren gewünschten Röstgrad (Hell bis Espresso). Frisch auf Bestellung geröstet.",
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

        // 2. 🍦 ICE CREAM: Custom Pint Flavor Mix & Bespoke Quote Request (no scoop counting)
        let gelatoConfig = CustomizationConfig(
            id: "cfg-gelato-pint",
            productId: "prod-gelato-custom-tub",
            archetype: .flavorMix,
            sliderTitle: "Aromen- & Fruchtanteile im Pint",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 450,
            maxSelectableComponents: 3,
            components: [
                BlendComponent(id: "g-maracuja", name: "Passionsfrucht / Maracuja (Fruchtpur)", origin: "Sonnengereift", process: "Vegan & Säuerlich-Fruchtig", notes: ["Maracuja", "Erfrischend"], priceMultiplier: 1.10, hexColor: "EFA00B", maxRatio: 100, inStock: true, stockQuantity: 60, allergens: []),
                BlendComponent(id: "g-himbeere", name: "Wildhimbeer Coulis", origin: "Emmental", process: "Fruchtig & aromatisch", notes: ["Himbeere", "Sommer"], priceMultiplier: 1.05, hexColor: "C94F5C", maxRatio: 100, inStock: true, stockQuantity: 80, allergens: []),
                BlendComponent(id: "g-pistazie", name: "Sizilianische Bronte-Pistazie", origin: "D.O.P. Sizilien", process: "Nussig & intensiv", notes: ["Pistazie", "Röstnoten"], priceMultiplier: 1.25, hexColor: "8DAA59", maxRatio: 100, inStock: true, stockQuantity: 45, allergens: [.nuts, .milk]),
                BlendComponent(id: "g-bergmilch", name: "Berner Bergmilch Fior di Latte", origin: "Berner Oberland", process: "Cremig & pur", notes: ["Frische Sahne", "Vanille"], priceMultiplier: 0.95, hexColor: "F5F3E9", maxRatio: 100, inStock: true, stockQuantity: 100, allergens: [.milk]),
                BlendComponent(id: "g-schoko", name: "Dunkle Valrhona Schokolade 70%", origin: "Guanaja Blend", process: "Kräftig & herb", notes: ["Bitterschokolade"], priceMultiplier: 1.10, hexColor: "3C2415", maxRatio: 100, inStock: true, stockQuantity: 50, allergens: [.milk, .soy]),
                BlendComponent(id: "g-haselnuss", name: "Piemonteser Haselnuss I.G.P.", origin: "Langhe Piemont", process: "Geröstet & samtig", notes: ["Haselnuss", "Nougat"], priceMultiplier: 1.15, hexColor: "A2703F", maxRatio: 100, inStock: true, stockQuantity: 70, allergens: [.nuts, .milk])
            ],
            options: [
                CustomizationOption(
                    key: "pint_base",
                    title: "Gelato-Grundbasis",
                    defaultValue: "bergmilch",
                    isRequired: true,
                    values: [
                        OptionChoice(label: "Bio-Berner Bergmilch (Klassisch cremig)", value: "bergmilch", priceDelta: 0, allergens: [.milk]),
                        OptionChoice(label: "Vegane Hafer- & Mandelbasis (+ CHF 1.00)", value: "oat_vegan", priceDelta: 1.0, allergens: [.nuts]),
                        OptionChoice(label: "Reines Frucht-Sorbet (100% Vegan & laktosefrei)", value: "sorbet", priceDelta: 0, allergens: [])
                    ]
                ),
                CustomizationOption(
                    key: "swirl_in",
                    title: "Hausgemachter Swirl & Inclusions",
                    defaultValue: "none",
                    isRequired: false,
                    values: [
                        OptionChoice(label: "Ohne Swirl", value: "none", priceDelta: 0),
                        OptionChoice(label: "Gletscher-Salzkaramell Swirl (+ CHF 1.50)", value: "salted_caramel", priceDelta: 1.50, allergens: [.milk]),
                        OptionChoice(label: "Wildhimbeer-Balsamico Swirl (+ CHF 1.50)", value: "raspberry_swirl", priceDelta: 1.50),
                        OptionChoice(label: "Gerösteter Pistazien-Crunch (+ CHF 2.00)", value: "pistachio_crunch", priceDelta: 2.00, allergens: [.nuts])
                    ]
                )
            ],
            customFields: [
                CustomField(
                    id: "cf-gelato-sweetness",
                    key: "sweetness_level",
                    title: "Süsse- & Säure-Balance",
                    subtitle: "Bestimmt das Verhältnis aus natürlicher Fruchtsäure und feiner Süsse",
                    fieldType: .slider(
                        min: 70, max: 130, step: 10, unit: "%", defaultValue: 100,
                        labels: [
                            SliderLabel(value: 70, label: "Fruchtig-Säuerlich (70%)"),
                            SliderLabel(value: 100, label: "Ausgewogen (100%)"),
                            SliderLabel(value: 130, label: "Süss & Mild (130%)")
                        ]
                    ),
                    isRequired: true,
                    order: 0
                ),
                CustomField(
                    id: "cf-gelato-tags",
                    key: "flavor_notes",
                    title: "Geschmacksprofil der Kreation",
                    subtitle: "Wählen Sie die dominierenden Noten Ihrer Mischung",
                    fieldType: .tasteProfile(availableTags: ["fruchtig", "süss", "nussig", "cremig", "sauer / herb", "schokoladig", "erfrischend", "vegan"]),
                    isRequired: false,
                    order: 1
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Maracuja-Himbeer Sommer-Pint",
                maxHeadlineLength: 26,
                allowDedication: true,
                maxDedicationLength: 40,
                fixedBrandStamp: "+ SWISS CRAFT · GLETSCHER GELATO"
            ),
            allowsBespokeQuoteRequest: true,
            bespokePlaceholder: "Beschreiben Sie Ihre Wunschkreation (z.B. Maracuja-Himbeer Sorbet mit geröstetem Bergthymian & rosa Pfeffer, eher fruchtig-säuerlich)...",
            bespokeTasteTags: ["fruchtig", "süss", "nussig", "cremig", "sauer / erfrischend", "schokoladig", "kräuter / floral", "vegan"]
        )

        let gelatoCustomTub = Product(
            id: "prod-gelato-custom-tub",
            producerId: "prod-gletscher-gelato",
            title: "Artisan Gelato Pint (500ml) & Eigenkreation",
            subtitle: "Freier Geschmacksmix (z.B. Maracuja + Himbeer) oder Wunschrezept anfragen",
            description: "Kreieren Sie Ihren persönlichen 500ml-Pint aus frischer Bergmilch oder veganer Basis mit freier Aromakombination. Sie können auch eine ganz eigene Spezial-Kreation anfragen, die unsere Eismeister prüfen und offerieren.",
            category: .iceCream,
            basePrice: 14.50,
            unitText: "500ml Pint-Becher",
            weightGrams: 450,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "gelato_hero",
            tags: ["Tagesfrisch", "Freier Mix", "Offert-Option", "Abholung"],
            config: gelatoConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .pickupOnly,
            allergens: []
        )

        // 3. 🍺 BEER: Curated Box & Sondersud-Anfrage
        let beerConfig = CustomizationConfig(
            id: "cfg-beer-box",
            productId: "prod-beer-custom-box",
            archetype: .buildABox,
            sliderTitle: "Flaschenauswahl für 6er-Box",
            targetTotal: 6,
            targetUnit: " Flaschen",
            totalWeightGrams: 1980,
            components: [
                BlendComponent(id: "b-hazy", name: "Aare Hazy Double IPA (7.2%)", origin: "Citra Dry Hop", process: "Fruchtig & trüb", notes: ["Maracuja", "Grapefruit"], priceMultiplier: 1.12, hexColor: "EBB344", maxRatio: 6, inStock: true, stockQuantity: 180, allergens: [.gluten]),
                BlendComponent(id: "b-pale", name: "Kettenbrücke Session Pale (4.8%)", origin: "Hallertau Blanc", process: "Leicht & frisch", notes: ["Stachelbeere", "Frisch"], priceMultiplier: 0.95, hexColor: "F4D06F", maxRatio: 6, inStock: true, stockQuantity: 240, allergens: [.gluten]),
                BlendComponent(id: "b-sour", name: "Jura Wild Sour Cherry (5.5%)", origin: "Sauerkirschen", process: "Säuerlich & trocken", notes: ["Fruchtsäure", "Trocken"], priceMultiplier: 1.20, hexColor: "9C2E35", maxRatio: 6, inStock: true, stockQuantity: 90, allergens: [.gluten, .sulfites]),
                BlendComponent(id: "b-porter", name: "Altstadt Smoked Porter (6.8%)", origin: "Rauchmalz", process: "Rauchig & dunkel", notes: ["Bitterschokolade", "Rauch"], priceMultiplier: 1.05, hexColor: "261C14", maxRatio: 6, inStock: true, stockQuantity: 40, allergens: [.gluten])
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
            customFields: [
                CustomField(
                    id: "cf-beer-glass",
                    key: "glassware",
                    title: "Tasting-Glas Zugabe",
                    subtitle: "Handgefertigtes Atelier Verkostungsglas",
                    fieldType: .singleChoice(options: [
                        OptionChoice(label: "Kein Zusatzglas", value: "none", priceDelta: 0),
                        OptionChoice(label: "1x Atelier Sommelier-Glas (+ CHF 7.00)", value: "1_glass", priceDelta: 7.0),
                        OptionChoice(label: "2x Sommelier-Gläser Set (+ CHF 12.00)", value: "2_glasses", priceDelta: 12.0)
                    ]),
                    isRequired: false,
                    order: 0
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Summer Solstice Sud #08",
                maxHeadlineLength: 25,
                allowDedication: true,
                maxDedicationLength: 40,
                fixedBrandStamp: "+ SWISS CRAFT · AARAU HOPS"
            ),
            allowsBespokeQuoteRequest: true,
            bespokePlaceholder: "Sondersud-Anfrage: z.B. 24er Kiste NEIPA mit Citra & Mosaic für ein Fest...",
            bespokeTasteTags: ["hopfenbetont / bitter", "fruchtig / tropisch", "malzig / süss", "sauer / trocken", "rauchig", "dunkel"]
        )

        let beerBox = Product(
            id: "prod-beer-custom-box",
            producerId: "prod-aarau-hops",
            title: "Curated 6er Craft Beer Flight & Custom Label",
            subtitle: "Stellen Sie Ihre 6 Flaschen zusammen oder fragen Sie einen Sondersud an",
            description: "Wählen Sie 6 Flaschen aus unseren frischen Suden mit individuellem Etikett oder fragen Sie einen exklusiven Sondersud für Ihren Event an.",
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

        // 4. 🍫 CHOCOLATE: Grand Cru Tafel (Kakaogehalt-Slider 55-88%, Ursprung, Inklusionen)
        let chocolateConfig = CustomizationConfig(
            id: "cfg-chocolate-bar",
            productId: "prod-chocolate-bar-custom",
            archetype: .flavorMix,
            sliderTitle: "Edelinversionen & Toppings",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 120,
            maxSelectableComponents: 3,
            components: [
                BlendComponent(id: "ch-nibs", name: "Bio Kakaobruch (Peru)", origin: "Chuncho Urkakao", process: "Geröstet & crunchy", notes: ["Kakao pur", "Crunch"], priceMultiplier: 1.10, hexColor: "4A2E18", maxRatio: 100, inStock: true, stockQuantity: 90, allergens: []),
                BlendComponent(id: "ch-salz", name: "Fleur de Sel de Guérande", origin: "Atlantikküste", process: "Handgeschöpft", notes: ["Feines Meersalz"], priceMultiplier: 1.05, hexColor: "DCD6CD", maxRatio: 100, inStock: true, stockQuantity: 120, allergens: []),
                BlendComponent(id: "ch-himbeer", name: "Gefriergetrocknete Himbeeren", origin: "Schweiz", process: "Fruchtig & knusprig", notes: ["Fruchtsäure", "Beeren"], priceMultiplier: 1.15, hexColor: "C0392B", maxRatio: 100, inStock: true, stockQuantity: 55, allergens: []),
                BlendComponent(id: "ch-haselnuss", name: "Geröstete Piemont-Haselnüsse", origin: "Piemont I.G.P.", process: "Karamellisiert", notes: ["Nussig", "Knusprig"], priceMultiplier: 1.20, hexColor: "B9770E", maxRatio: 100, inStock: true, stockQuantity: 70, allergens: [.nuts]),
                BlendComponent(id: "ch-pfeffer", name: "Rosa Pfeffer & Chili-Flocken", origin: "Madagaskar", process: "Würzige Schärfe", notes: ["Würzig", "Leichte Schärfe"], priceMultiplier: 1.10, hexColor: "922B21", maxRatio: 100, inStock: true, stockQuantity: 40, allergens: [])
            ],
            options: [
                CustomizationOption(
                    key: "cacao_origin",
                    title: "Edelkakao-Provenienz",
                    defaultValue: "peru_chuncho",
                    isRequired: true,
                    values: [
                        OptionChoice(label: "Peru Chuncho (Floral & tropisch)", value: "peru_chuncho", priceDelta: 0),
                        OptionChoice(label: "Ecuador Hacienda Victoria (Nussig & Karamell)", value: "ecuador_victoria", priceDelta: 0),
                        OptionChoice(label: "Venezuela Carenero Superior (Würzig & Tabak)", value: "venezuela_carenero", priceDelta: 1.50)
                    ]
                )
            ],
            customFields: [
                CustomField(
                    id: "cf-choco-cocoa",
                    key: "cocoa_percentage",
                    title: "Kakaogehalt & Intensität",
                    subtitle: "Bestimmt die Balance aus Schmelz, Bitternote und natürlicher Kakaosüsse",
                    fieldType: .slider(
                        min: 55, max: 88, step: 3, unit: "%", defaultValue: 72,
                        labels: [
                            SliderLabel(value: 55, label: "Mild & Cremig (55%)"),
                            SliderLabel(value: 72, label: "Grand Cru Klassik (72%)"),
                            SliderLabel(value: 88, label: "Intensiv Dark (88%)")
                        ]
                    ),
                    isRequired: true,
                    order: 0
                ),
                CustomField(
                    id: "cf-choco-tags",
                    key: "taste_profile",
                    title: "Gewünschtes Geschmacksprofil",
                    subtitle: "Wählen Sie die aromatische Ausrichtung",
                    fieldType: .tasteProfile(availableTags: ["herb", "schokoladig", "fruchtig", "nussig", "salzig", "würzig", "feurig"]),
                    isRequired: false,
                    order: 1
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Grand Cru Basel Edition",
                maxHeadlineLength: 26,
                allowDedication: true,
                maxDedicationLength: 40,
                fixedBrandStamp: "+ SWISS CRAFT · CACAO BASEL"
            ),
            allowsBespokeQuoteRequest: true,
            bespokePlaceholder: "Wunschtafel: z.B. 80% Tafel mit geräuchertem Meersalz und getrockneten Feigen...",
            bespokeTasteTags: ["herb", "schokoladig", "fruchtig", "nussig", "salzig / karamell", "würzig"]
        )

        let chocolateBar = Product(
            id: "prod-chocolate-bar-custom",
            producerId: "prod-cacao-basel",
            title: "Grand Cru Schokoladentafel & Inklusionen (120g)",
            subtitle: "Kakaogehalt (55–88%) & Edelinversionen frei bestimmen",
            description: "Wählen Sie Kakaogehalt, Urkakao-Herkunft und Edelinversionen wie Fleur de Sel oder Piemont-Haselnüsse mit edler Banderole.",
            category: .chocolate,
            basePrice: 14.50,
            unitText: "120g Tafel",
            weightGrams: 120,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "chocolate_bar_custom",
            tags: ["Bean-to-Bar", "Grand Cru", "Basel"],
            config: chocolateConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: [.milk, .soy]
        )

        // 5. 🎂 BAKERY: Anlass-Torte nach Mass (Grössen-Slider, Geschmacksprofil, Offertanfrage)
        let bakeryConfig = CustomizationConfig(
            id: "cfg-bakery-cake",
            productId: "prod-bakery-cake",
            archetype: .bespoke,
            sliderTitle: "Torten-Spezifikation",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 1500,
            options: [
                CustomizationOption(
                    key: "sponge",
                    title: "Biskuit- & Teigart",
                    defaultValue: "vanilla",
                    isRequired: true,
                    values: [
                        OptionChoice(label: "Lockerer Bourbon-Vanille Biskuit", value: "vanilla", priceDelta: 0, allergens: [.gluten, .eggs]),
                        OptionChoice(label: "Dunkler Valrhona Schoko-Biskuit", value: "chocolate", priceDelta: 0, allergens: [.gluten, .eggs, .milk]),
                        OptionChoice(label: "Nuss-Mandel-Teig (Glutenreduziert)", value: "almond_nut", priceDelta: 5.0, allergens: [.nuts, .eggs]),
                        OptionChoice(label: "Zitronen-Mohn Rührteig", value: "lemon_poppy", priceDelta: 0, allergens: [.gluten, .eggs])
                    ]
                ),
                CustomizationOption(
                    key: "cream",
                    title: "Creme & Füllung",
                    defaultValue: "raspberry_mascarpone",
                    isRequired: true,
                    values: [
                        OptionChoice(label: "Frische Himbeer-Mascarpone Creme", value: "raspberry_mascarpone", priceDelta: 0, allergens: [.milk]),
                        OptionChoice(label: "Dunkle Grand Cru Schoko-Ganache", value: "dark_ganache", priceDelta: 0, allergens: [.milk]),
                        OptionChoice(label: "Passionsfrucht-Limetten Quarkcreme", value: "passion_lime", priceDelta: 0, allergens: [.milk]),
                        OptionChoice(label: "Pistazien-Mousseline Creme", value: "pistachio_mousseline", priceDelta: 6.0, allergens: [.milk, .nuts])
                    ]
                )
            ],
            customFields: [
                CustomField(
                    id: "cf-cake-size",
                    key: "guest_count",
                    title: "Personenanzahl / Grösse der Torte",
                    subtitle: "Bestimmt Durchmesser, Etagen und Portionierung",
                    fieldType: .slider(
                        min: 6, max: 30, step: 2, unit: " Pers.", defaultValue: 12,
                        labels: [
                            SliderLabel(value: 6, label: "Kompakt (6 Pers.)"),
                            SliderLabel(value: 12, label: "Klassisch (12 Pers.)"),
                            SliderLabel(value: 20, label: "Gross (20 Pers.)"),
                            SliderLabel(value: 30, label: "Festlich 2-stöckig (30 Pers.)")
                        ]
                    ),
                    isRequired: true,
                    order: 0
                ),
                CustomField(
                    id: "cf-cake-tags",
                    key: "taste_direction",
                    title: "Geschmacksrichtung & Stil",
                    subtitle: "Welche Charakteristik soll die Torte haben?",
                    fieldType: .tasteProfile(availableTags: ["fruchtig", "süss", "nussig", "schokoladig", "säuerlich-frisch", "leicht", "üppig", "vegan möglich"]),
                    isRequired: true,
                    order: 1
                ),
                CustomField(
                    id: "cf-cake-text",
                    key: "dedication_text",
                    title: "Aufschrift auf Marzipan-Schild",
                    subtitle: "Handgeschriebene Widmung (z.B. Alles Gute zum 40. Geburtstag)",
                    fieldType: .text(placeholder: "z.B. Alles Liebe zum Geburtstag!", maxLen: 35, isMultiline: false),
                    isRequired: false,
                    order: 2
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Jubiläumstorte Steiner",
                maxHeadlineLength: 30,
                allowDedication: true,
                maxDedicationLength: 60,
                fixedBrandStamp: "+ SWISS CRAFT · ZOPF & ZEIT"
            ),
            allowsBespokeQuoteRequest: true,
            bespokePlaceholder: "Beschreiben Sie besondere Wünsche: Deko (frische Blumen, Blattgold), Farbkonzept oder Unverträglichkeiten...",
            bespokeTasteTags: ["fruchtig", "süss", "nussig", "schokoladig", "floral", "vegan möglich"]
        )

        let bakeryCake = Product(
            id: "prod-bakery-cake",
            producerId: "prod-zopf-zeit",
            title: "Anlass-Torte & Festgebäck nach Mass",
            subtitle: "Grösse, Biskuit, Füllung und Geschmacksprofil individuell abstimmen",
            description: "Jede Torte wird als Einzelstück nach Ihren Vorgaben gebacken. Konfigurieren Sie Ihre Wunschtorte oder fordern Sie eine individuelle Offerte an.",
            category: .bakery,
            basePrice: 0,
            unitText: "Torte (6–30 Pers.)",
            weightGrams: 1500,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "bakery_hero",
            tags: ["Festtorte", "Konditorei", "Offert-Option", "Abholung"],
            config: bakeryConfig,
            transactionMode: .quoteRequest,
            shippingRestriction: .pickupOnly,
            allergens: [.gluten, .eggs, .milk]
        )

        // 6. 🍸 SPIRITS: Custom Botanical Spirit / Gin (Alpen-Botanicals, Trinkstärke-Slider)
        let spiritsConfig = CustomizationConfig(
            id: "cfg-spirits-gin",
            productId: "prod-spirits-gin-custom",
            archetype: .recipeBlend,
            sliderTitle: "Botanical-Mischung (max. 3 Komponenten)",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 500,
            maxSelectableComponents: 3,
            components: [
                BlendComponent(id: "sp-wacholder", name: "Schweizer Alpen-Wacholder", origin: "Walliser Alpen", process: "Harzig & kräftig", notes: ["Wacholder", "Kiefer"], priceMultiplier: 1.05, hexColor: "2D5F3E", maxRatio: 100, inStock: true, stockQuantity: 60, allergens: []),
                BlendComponent(id: "sp-zitrus", name: "Amalfi-Zitrone & Bergamotte", origin: "Süditalien", process: "Frisch & spritzig", notes: ["Zitrus", "Frisch"], priceMultiplier: 1.10, hexColor: "F4D03F", maxRatio: 100, inStock: true, stockQuantity: 80, allergens: []),
                BlendComponent(id: "sp-floral", name: "Lavendel & Holunderblüte", origin: "Berner Seeland", process: "Floral & lieblich", notes: ["Lavendel", "Holunder"], priceMultiplier: 1.15, hexColor: "9B59B6", maxRatio: 100, inStock: true, stockQuantity: 40, allergens: []),
                BlendComponent(id: "sp-wuerze", name: "Kardamom, Koriander & Rosa Pfeffer", origin: "Indien & Madagaskar", process: "Würzig & komplex", notes: ["Kardamom", "Pfeffer"], priceMultiplier: 1.10, hexColor: "C0392B", maxRatio: 100, inStock: true, stockQuantity: 50, allergens: [])
            ],
            options: [
                CustomizationOption(
                    key: "finish",
                    title: "Reifung & Veredelung",
                    defaultValue: "glass",
                    isRequired: true,
                    values: [
                        OptionChoice(label: "Klassisch im Glasballon gereift (Klar)", value: "glass", priceDelta: 0),
                        OptionChoice(label: "Im Schweizer Eichenholz-Fass gereift (+ CHF 8.00)", value: "oak_barrel", priceDelta: 8.0)
                    ]
                )
            ],
            customFields: [
                CustomField(
                    id: "cf-spirits-abv",
                    key: "alcohol_strength",
                    title: "Trinkstärke / Alkoholgehalt",
                    subtitle: "Beeinflusst Intensität, Mundgefühl und Aromenbindung",
                    fieldType: .slider(
                        min: 41, max: 47, step: 1, unit: "% Vol.", defaultValue: 43,
                        labels: [
                            SliderLabel(value: 41, label: "Mild (41% Vol.)"),
                            SliderLabel(value: 43, label: "Klassisch (43% Vol.)"),
                            SliderLabel(value: 47, label: "Navy Strength (47% Vol.)")
                        ]
                    ),
                    isRequired: true,
                    order: 0
                ),
                CustomField(
                    id: "cf-spirits-tags",
                    key: "aroma_profile",
                    title: "Aromatischer Schwerpunkt",
                    subtitle: "Wählen Sie das Geschmacksprofil",
                    fieldType: .tasteProfile(availableTags: ["wacholderbetont", "zitrisch", "floral", "würzig", "harzig", "herb", "lieblich"]),
                    isRequired: false,
                    order: 1
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Alpine Reserve Gin No. 01",
                maxHeadlineLength: 28,
                allowDedication: true,
                maxDedicationLength: 45,
                fixedBrandStamp: "+ SWISS CRAFT · MATTER DISTILLERS"
            ),
            allowsBespokeQuoteRequest: true,
            bespokePlaceholder: "Eigener Brand: z.B. Hochzeits-Gin mit Botanicals aus dem eigenen Garten...",
            bespokeTasteTags: ["wacholderbetont", "zitrisch-frisch", "floral", "würzig", "harzig", "herb"]
        )

        let spiritsGin = Product(
            id: "prod-spirits-gin-custom",
            producerId: "prod-matter-distillers",
            title: "Custom Botanical Spirit / Gin (500ml)",
            subtitle: "Botanical-Mischung (max. 3 Noten) & Trinkstärke (41–47% Vol.)",
            description: "Wählen Sie bis zu 3 Botanical-Aromen aus Schweizer Alpenwacholder, Zitrus und Kräutern. Definieren Sie Trinkstärke und Fassreifung mit Apothekerflaschen-Etikett.",
            category: .spirits,
            basePrice: 46.00,
            unitText: "500ml Flasche",
            weightGrams: 950,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "craft_brewery_hero",
            tags: ["Small Batch", "Kupferkessel", "Kallnach"],
            config: spiritsConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: []
        )

        // 7. 🍵 TEA: Custom Alpine Tea Blend (max 3 Basen, Intensitäts-Slider)
        let teaConfig = CustomizationConfig(
            id: "cfg-tea-blend",
            productId: "prod-tea-blend-custom",
            archetype: .recipeBlend,
            sliderTitle: "Teebasen & Blüten (max. 3 Komponenten)",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 100,
            maxSelectableComponents: 3,
            components: [
                BlendComponent(id: "t-krauter", name: "Bio Engadiner Bergkräuter (Minze & Thymian)", origin: "Engadin 1'800m", process: "Handgepflückt", notes: ["Pfefferminze", "Bergthymian"], priceMultiplier: 1.10, hexColor: "27AE60", maxRatio: 100, inStock: true, stockQuantity: 80, allergens: []),
                BlendComponent(id: "t-sencha", name: "Japanischer Bio Sencha Grüntee", origin: "Kagoshima", process: "Gedämpft & frisch", notes: ["Grasig", "Umami"], priceMultiplier: 1.15, hexColor: "52BE80", maxRatio: 100, inStock: true, stockQuantity: 60, allergens: []),
                BlendComponent(id: "t-assam", name: "Assam FTGFOP Bio Schwarztee", origin: "Assam Indien", process: "Vollmundig & malzig", notes: ["Malz", "Würze"], priceMultiplier: 1.05, hexColor: "784212", maxRatio: 100, inStock: true, stockQuantity: 90, allergens: []),
                BlendComponent(id: "t-rooibos", name: "Bio Rotbusch Super Grade (Koffeinfrei)", origin: "Südafrika", process: "Mild & nussig", notes: ["Süsslich", "Koffeinfrei"], priceMultiplier: 1.00, hexColor: "BA4A00", maxRatio: 100, inStock: true, stockQuantity: 100, allergens: []),
                BlendComponent(id: "t-blueten", name: "Arven- & Kornblumenblüten", origin: "Engadiner Arvenwald", process: "Luftgetrocknet", notes: ["Arvenduft", "Floral"], priceMultiplier: 1.20, hexColor: "2980B9", maxRatio: 100, inStock: true, stockQuantity: 40, allergens: [])
            ],
            options: [],
            customFields: [
                CustomField(
                    id: "cf-tea-intensity",
                    key: "intensity",
                    title: "Aromaintensität der Mischung",
                    subtitle: "Bestimmt den empfohlenen Dosierungs- und Ziehzeit-Charakter",
                    fieldType: .slider(
                        min: 1, max: 3, step: 1, unit: "", defaultValue: 2,
                        labels: [
                            SliderLabel(value: 1, label: "Sanft & Zart (1/3)"),
                            SliderLabel(value: 2, label: "Harmonisch Ausgewogen (2/3)"),
                            SliderLabel(value: 3, label: "Kräftig & Aromatisch (3/3)")
                        ]
                    ),
                    isRequired: true,
                    order: 0
                ),
                CustomField(
                    id: "cf-tea-tags",
                    key: "taste_profile",
                    title: "Wirkung & Geschmacksprofil",
                    subtitle: "Wählen Sie das passende Aromaprofil",
                    fieldType: .tasteProfile(availableTags: ["kräuterig", "floral", "fruchtig", "beruhigend", "belebend", "koffeinfrei", "wärmend"]),
                    isRequired: false,
                    order: 1
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Engadiner Abendruhe",
                maxHeadlineLength: 26,
                allowDedication: true,
                maxDedicationLength: 40,
                fixedBrandStamp: "+ SWISS CRAFT · ENGADIN TEA"
            ),
            allowsBespokeQuoteRequest: true,
            bespokePlaceholder: "Spezialmischung: z.B. Reiner Arvenblüten-Tee mit Apfelstücken für ein Wellness-Hotel...",
            bespokeTasteTags: ["kräuterig", "floral", "fruchtig", "beruhigend", "belebend", "koffeinfrei"]
        )

        let teaCustom = Product(
            id: "prod-tea-blend-custom",
            producerId: "prod-engadin-tea",
            title: "Custom Alpine Tea Blend (100g Dose)",
            subtitle: "Bergkräuter, Sencha oder Assam mit Arvenblüten frei kombinieren",
            description: "Stellen Sie Ihre persönliche Teemischung aus bis zu 3 Schweizer Alpenkräutern und Grand Cru Teebasen zusammen. Inklusive geprägter Teedose.",
            category: .tea,
            basePrice: 18.50,
            unitText: "100g Aromadose",
            weightGrams: 100,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "gelato_hero",
            tags: ["Bio", "Alpenkräuter", "St. Moritz"],
            config: teaConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: []
        )

        // 8. 🫒 DELI & SPICES: Custom Kräuter-Würzsalz (Schärfegrad-Slider 1-5, Mahlung)
        let deliConfig = CustomizationConfig(
            id: "cfg-deli-rub",
            productId: "prod-deli-rub-custom",
            archetype: .recipeBlend,
            sliderTitle: "Gewürz- & Kräuteranteile (max. 3 Sorten)",
            targetTotal: 100,
            targetUnit: "%",
            totalWeightGrams: 150,
            maxSelectableComponents: 3,
            components: [
                BlendComponent(id: "dl-rosmarin", name: "Tessiner Bergrosmarin & Salbei", origin: "Vallemaggia", process: "Schonend luftgetrocknet", notes: ["Mediterran", "Harzig"], priceMultiplier: 1.05, hexColor: "1E8449", maxRatio: 100, inStock: true, stockQuantity: 90, allergens: []),
                BlendComponent(id: "dl-chili", name: "Tessiner Peperoncini Flocken", origin: "Magadinoebene", process: "Sonnengereift & feurig", notes: ["Feurig", "Pikant"], priceMultiplier: 1.10, hexColor: "C0392B", maxRatio: 100, inStock: true, stockQuantity: 65, allergens: []),
                BlendComponent(id: "dl-knoblauch", name: "Fermentierter schwarzer Knoblauch", origin: "Mendrisiotto", process: "Balsamisch & mild", notes: ["Umami", "Süsslich"], priceMultiplier: 1.20, hexColor: "2C3E50", maxRatio: 100, inStock: true, stockQuantity: 40, allergens: []),
                BlendComponent(id: "dl-zitronenthymian", name: "Zitronenthymian & Meersalz", origin: "Lugano", process: "Zitronig-frisch", notes: ["Zitrus", "Frische"], priceMultiplier: 1.05, hexColor: "F4D03F", maxRatio: 100, inStock: true, stockQuantity: 110, allergens: []),
                BlendComponent(id: "dl-pilze", name: "Wilde Tessiner Steinpilze & Wacholder", origin: "Centovalli", process: "Intensiv pilzig", notes: ["Steinpilz", "Wald"], priceMultiplier: 1.25, hexColor: "7E5109", maxRatio: 100, inStock: true, stockQuantity: 35, allergens: [])
            ],
            options: [
                CustomizationOption(
                    key: "grind_style",
                    title: "Körnung & Mahlstufe",
                    defaultValue: "coarse",
                    isRequired: true,
                    values: [
                        OptionChoice(label: "Grobe Mühlenkörnung (Für Fleisch & BBQ)", value: "coarse", priceDelta: 0),
                        OptionChoice(label: "Feines Tischstreusalz (Für Pasta & Salat)", value: "fine", priceDelta: 0),
                        OptionChoice(label: "Knusprige Pyramiden-Flocken (+ CHF 2.00)", value: "flakes", priceDelta: 2.0)
                    ]
                )
            ],
            customFields: [
                CustomField(
                    id: "cf-deli-heat",
                    key: "heat_level",
                    title: "Schärfegrad (Peperoncini-Anteil)",
                    subtitle: "Von mild-mediterran bis intensiv feurig",
                    fieldType: .slider(
                        min: 1, max: 5, step: 1, unit: " / 5", defaultValue: 2,
                        labels: [
                            SliderLabel(value: 1, label: "Mild (1/5)"),
                            SliderLabel(value: 2, label: "Pikant (2/5)"),
                            SliderLabel(value: 3, label: "Feurig (3/5)"),
                            SliderLabel(value: 5, label: "Extrem Scharf (5/5)")
                        ]
                    ),
                    isRequired: true,
                    order: 0
                ),
                CustomField(
                    id: "cf-deli-tags",
                    key: "flavor_direction",
                    title: "Aromen-Ausrichtung",
                    subtitle: "Geschmacksprofil des Würzsalzes",
                    fieldType: .tasteProfile(availableTags: ["mediterran", "scharf", "rauchig", "pilzig / umami", "zitronig", "knoblauchbetont"]),
                    isRequired: false,
                    order: 1
                )
            ],
            labelConfig: ManufacturerLabelConfig(
                allowed: true,
                headlinePlaceholder: "z.B. Ticino BBQ Special",
                maxHeadlineLength: 26,
                allowDedication: true,
                maxDedicationLength: 40,
                fixedBrandStamp: "+ SWISS CRAFT · TICINO GUSTO"
            ),
            allowsBespokeQuoteRequest: true,
            bespokePlaceholder: "Eigenkreation: z.B. Spezialrub für Wildfleisch mit Wacholder, Salbei und Kastanienmehl...",
            bespokeTasteTags: ["mediterran", "scharf", "rauchig", "pilzig / umami", "zitronig", "kräuterig"]
        )

        let deliCustom = Product(
            id: "prod-deli-rub-custom",
            producerId: "prod-ticino-gusto",
            title: "Individuelles Kräuter-Würzsalz (150g)",
            subtitle: "Tessiner Kräuter (max. 3 Sorten) & Schärfegrad frei mischen",
            description: "Kreieren Sie Ihr persönliches Gourmet-Würzsalz aus sonnengetrocknetem Rosmarin, schwarzem Knoblauch, Peperoncini und Meersalz.",
            category: .deli,
            basePrice: 15.50,
            unitText: "150g Glas",
            weightGrams: 150,
            isCustomizable: true,
            stockQuantity: nil,
            imageUrl: "bakery_hero",
            tags: ["Tessin", "Handgemacht", "Lugano"],
            config: deliConfig,
            transactionMode: .instantCheckout,
            shippingRestriction: .standard,
            allergens: []
        )

        self.products = [
            coffeeCustom, coffeeGeisha,
            gelatoCustomTub,
            beerBox,
            chocolateBar,
            bakeryCake,
            spiritsGin,
            teaCustom,
            deliCustom
        ]
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
                    customFieldValues: ["roast_level": "Medium (Omniroast)"],
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

        // Seed an ice cream bespoke quote request
        let iceCreamQuote = Quote(
            id: "seed-quote-2001",
            quoteNumber: "OFF-2026-9104",
            producerId: "prod-gletscher-gelato",
            producerName: "Gletscher Gelato Bern",
            customer: CustomerDetails(name: "Elena Meier", email: "elena.meier@gmx.ch", street: "Kramgasse 14", postalCode: "3011", city: "Bern", country: .ch),
            items: [QuoteItem(productTitle: "Eigenkreation Gelato Pint (2x 500ml)", quantity: 2)],
            customerNote: "Eigenkreation-Anfrage: Maracuja-Himbeer Sorbet mit geröstetem Bergthymian & rosa Pfeffer, eher fruchtig-säuerlich.",
            selectedTasteTags: ["fruchtig", "sauer / erfrischend", "kräuter / floral", "vegan"],
            bespokeDescription: "Maracuja-Himbeer Sorbet mit geröstetem Bergthymian & rosa Pfeffer, eher fruchtig-säuerlich und extra erfrischend.",
            customFieldValues: ["sweetness_level": "70% (Fruchtig-Säuerlich)", "pint_base": "sorbet"],
            status: .requested,
            quotedPrice: nil,
            quotedNote: nil,
            createdAt: Date().addingTimeInterval(-3600)
        )

        self.orders = [seedOrder]
        self.quotes = [iceCreamQuote]
    }
}
