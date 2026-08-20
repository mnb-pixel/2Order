import Foundation
import SwiftUI

// MARK: - Category & Country Enums
enum CraftCategory: String, CaseIterable, Codable, Identifiable {
    case coffee = "coffee"
    case beer = "beer"
    case chocolate = "chocolate"
    case spirits = "spirits"
    case iceCream = "ice_cream"
    case bakery = "bakery"
    case tea = "tea"
    case deli = "deli"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .coffee: return "Röstereien"
        case .beer: return "Brauereien"
        case .chocolate: return "Chocolatiers"
        case .spirits: return "Destillerien"
        case .iceCream: return "Eismanufaktur"
        case .bakery: return "Bäckereien"
        case .tea: return "Teemanufaktur"
        case .deli: return "Feinkost"
        }
    }

    var iconName: String {
        switch self {
        case .coffee: return "cup.and.saucer.fill"
        case .beer: return "mug.fill"
        case .chocolate: return "sparkles"
        case .spirits: return "flame.fill"
        case .iceCream: return "takeoutbag.and.cup.and.straw.fill"
        case .bakery: return "birthday.cake.fill"
        case .tea: return "leaf.fill"
        case .deli: return "fork.knife"
        }
    }
}

enum DACHCountry: String, Codable, CaseIterable {
    case ch = "CH"
    case de = "DE"
    case at = "AT"

    // Single source of truth for the VAT split — used identically for the
    // checkout preview and the persisted order so the two can never diverge.
    var vatRate: Double {
        switch self {
        case .ch: return 0.081
        case .de: return 0.19
        case .at: return 0.20
        }
    }

    var currency: String {
        switch self {
        case .ch: return "CHF"
        case .de, .at: return "EUR"
        }
    }

    var displayName: String {
        switch self {
        case .ch: return "Schweiz"
        case .de: return "Deutschland"
        case .at: return "Österreich"
        }
    }
}

// MARK: - Allergens (EU/CH LMIV / LIV — 14 declarable allergens)
enum AllergenCode: String, Codable, CaseIterable, Identifiable {
    case gluten, crustaceans, eggs, fish, peanuts, soy, milk, nuts
    case celery, mustard, sesame, sulfites, lupin, molluscs

    var id: String { rawValue }

    var label: String {
        switch self {
        case .gluten: return "Glutenhaltiges Getreide"
        case .crustaceans: return "Krebstiere"
        case .eggs: return "Eier"
        case .fish: return "Fisch"
        case .peanuts: return "Erdnüsse"
        case .soy: return "Soja"
        case .milk: return "Milch/Laktose"
        case .nuts: return "Schalenfrüchte"
        case .celery: return "Sellerie"
        case .mustard: return "Senf"
        case .sesame: return "Sesam"
        case .sulfites: return "Sulfite"
        case .lupin: return "Lupinen"
        case .molluscs: return "Weichtiere"
        }
    }
}

// MARK: - Producer Model (Gewerbe)
struct Producer: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var tagline: String
    var category: CraftCategory
    var country: DACHCountry
    var city: String
    var currency: String
    var bio: String
    var heroImageUrl: String
    var vatNumber: String
    var leadTimeSchedule: String
    var batchScheduleNotice: String
    var establishedYear: Int
    var contactEmail: String
    var capacityPerBatch: Int? // max offene MTO-Aufträge pro Fertigungscharge; nil = unbegrenzt
    // Lightweight access code gating this Gewerbe's Werkstatt-Portal — a
    // client-side deterrent against casually switching into another
    // business's workspace on a shared device, NOT real authentication
    // (there is no backend/account system in this app).
    var portalPin: String

    static func == (lhs: Producer, rhs: Producer) -> Bool { lhs.id == rhs.id }
}

// MARK: - Dynamic Blend Component
struct BlendComponent: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var origin: String
    var process: String
    var notes: [String]
    var priceMultiplier: Double
    var hexColor: String
    var maxRatio: Double // per-component cap, in the config's target unit
    var inStock: Bool
    var stockQuantity: Int? // nil = unbegrenzt
    var allergens: [AllergenCode]

    var isOutOfStock: Bool {
        !inStock || (stockQuantity != nil && stockQuantity! <= 0)
    }
}

// MARK: - Dynamic Custom Option Choice
struct OptionChoice: Identifiable, Codable, Equatable {
    var id: String { value }
    var label: String
    var value: String
    var priceDelta: Double?
    var allergens: [AllergenCode] = []
}

struct CustomizationOption: Identifiable, Codable, Equatable {
    var id: String { key }
    var key: String
    var title: String
    var defaultValue: String
    var isRequired: Bool = true
    var values: [OptionChoice]
}

// MARK: - Dynamic Producer Custom Fields (Sliders, Steppers, Text, Taste Profiles)
struct SliderLabel: Codable, Equatable {
    var value: Double
    var label: String
}

enum CustomFieldType: Codable, Equatable {
    case slider(min: Double, max: Double, step: Double, unit: String, defaultValue: Double, labels: [SliderLabel]? = nil)
    case stepper(min: Int, max: Int, unit: String, defaultValue: Int)
    case text(placeholder: String, maxLen: Int, isMultiline: Bool)
    case singleChoice(options: [OptionChoice])
    case multipleChoice(options: [OptionChoice], maxSelections: Int?)
    case tasteProfile(availableTags: [String])
}

struct CustomField: Identifiable, Codable, Equatable {
    var id: String
    var key: String
    var title: String
    var subtitle: String?
    var fieldType: CustomFieldType
    var isRequired: Bool = false
    var order: Int = 0
}

// MARK: - Manufacturer Label Config
struct ManufacturerLabelConfig: Codable, Equatable {
    var allowed: Bool
    var headlinePlaceholder: String
    var maxHeadlineLength: Int
    var allowDedication: Bool
    var maxDedicationLength: Int
    var fixedBrandStamp: String
}

// MARK: - Customization Archetype
// recipeBlend = slider-driven ratio recipe with optional origin limit (coffee, tea, spirits, spices)
// flavorMix   = free flavor combination & inclusions (ice cream pint, chocolate toppings)
// buildABox   = free-quantity assembly (beer crate)
// bespoke     = made-to-order item with custom taste tags, sliders, and quote flow
enum CustomizationArchetype: String, Codable {
    case recipeBlend = "recipe_blend"
    case flavorMix = "flavor_mix"
    case buildABox = "build_a_box"
    case bespoke = "bespoke"

    var displayName: String {
        switch self {
        case .recipeBlend: return "Rezeptur-Mischung"
        case .flavorMix: return "Geschmacks-Mix"
        case .buildABox: return "Box & Flight"
        case .bespoke: return "Nach Mass / Bespoke"
        }
    }
}

// MARK: - Customization Config
struct CustomizationConfig: Identifiable, Codable, Equatable {
    var id: String
    var productId: String
    var archetype: CustomizationArchetype = .recipeBlend
    var sliderTitle: String
    var targetTotal: Double = 100
    var targetUnit: String = "%"
    var totalWeightGrams: Int
    var maxSelectableComponents: Int? = nil // e.g. max 3 beans for coffee
    var components: [BlendComponent] = []
    var options: [CustomizationOption] = []
    var customFields: [CustomField] = []
    var labelConfig: ManufacturerLabelConfig
    var allowsBespokeQuoteRequest: Bool = false
    var bespokePlaceholder: String? = nil
    var bespokeTasteTags: [String] = []
}

// MARK: - Transaction Mode & Shipping
enum TransactionMode: String, Codable {
    case instantCheckout = "instant_checkout"
    case quoteRequest = "quote_request"
}

enum ShippingRestriction: String, Codable {
    case standard, pickupOnly = "pickup_only", coldChain = "cold_chain"
}

// MARK: - Product Model (Standard vs Custom)
struct Product: Identifiable, Codable, Equatable {
    var id: String
    var producerId: String
    var title: String
    var subtitle: String
    var description: String
    var category: CraftCategory
    var basePrice: Double
    var unitText: String
    var weightGrams: Int
    var isCustomizable: Bool // true = Made to Order, false = Standard
    var stockQuantity: Int?
    var imageUrl: String
    var tags: [String]
    var config: CustomizationConfig?
    var transactionMode: TransactionMode = .instantCheckout
    var shippingRestriction: ShippingRestriction = .standard
    var allergens: [AllergenCode] = []

    var isOutOfStock: Bool {
        !isCustomizable && stockQuantity != nil && stockQuantity! <= 0
    }

    static func == (lhs: Product, rhs: Product) -> Bool { lhs.id == rhs.id }
}

// MARK: - Recipe Item
struct RecipeItem: Identifiable, Codable, Equatable {
    var id: String { componentId }
    let componentId: String
    let componentName: String
    let origin: String
    let ratio: Int
    let grams: Int
}

// MARK: - Custom Label Data
struct CustomLabelData: Codable, Equatable {
    var headline: String
    var subtitle: String
    var dedication: String
    var fontStyle: String
    var batchNumber: String
    var dateString: String
}

// MARK: - Cart Item
struct CartItem: Identifiable, Codable {
    var id: String = UUID().uuidString
    let product: Product
    let producer: Producer
    var quantity: Int
    var unitPrice: Double
    var recipe: [RecipeItem]?
    var selections: [String: String]?
    var customFieldValues: [String: String]?
    var selectedTasteTags: [String]?
    var bespokeDescription: String?
    var customLabel: CustomLabelData?

    var totalPrice: Double {
        unitPrice * Double(quantity)
    }

    // Single source of truth for this item's LMIV/LIV-relevant allergens
    var aggregatedAllergens: [AllergenCode] {
        var set = Set<AllergenCode>(product.allergens)
        if let config = product.config {
            if let recipe = recipe {
                for r in recipe {
                    if let comp = config.components.first(where: { $0.id == r.componentId }) {
                        set.formUnion(comp.allergens)
                    }
                }
            }
            if let selections = selections {
                for opt in config.options {
                    guard let val = selections[opt.key] else { continue }
                    if let choice = opt.values.first(where: { $0.value == val }) {
                        set.formUnion(choice.allergens)
                    }
                }
            }
        }
        return Array(set)
    }
}

// MARK: - Fulfillment
enum FulfillmentType: String, Codable {
    case shipping, pickup
}

// MARK: - Order Model
enum OrderStatus: String, Codable, CaseIterable {
    case paid = "paid"
    case inProduction = "in_production"
    case labeling = "labeling"
    case readyForHandover = "ready_for_handover" // "ready to ship" or "ready for pickup"
    case shipped = "shipped"
    case completed = "completed"

    // Pickup and shipping orders diverge from "labeling" onward — a pickup
    // order is never "unterwegs" — so the visible steps/titles branch on the
    // order's fulfillment type instead of forcing shipping language onto
    // every order.
    func title(for fulfillment: FulfillmentType) -> String {
        switch self {
        case .paid: return "Bezahlt & Eingeplant"
        case .inProduction: return "In Röstung / Produktion"
        case .labeling: return "Etikettierung & Kontrolle"
        case .readyForHandover:
            return fulfillment == .pickup ? "Abholbereit" : "Versandbereit"
        case .shipped:
            return "Versendet mit Frischegarantie"
        case .completed:
            return fulfillment == .pickup ? "Abgeholt" : "Zugestellt"
        }
    }

    var stepIndex: Int {
        switch self {
        case .paid: return 0
        case .inProduction: return 1
        case .labeling: return 2
        case .readyForHandover, .shipped: return 3
        case .completed: return 4
        }
    }

    // The ordered set of steps actually shown for a given fulfillment type —
    // a pickup order never passes through .shipped, and a shipping order
    // never shows "Abholbereit".
    static func steps(for fulfillment: FulfillmentType) -> [OrderStatus] {
        if fulfillment == .pickup {
            return [.paid, .inProduction, .labeling, .readyForHandover, .completed]
        }
        return [.paid, .inProduction, .labeling, .shipped, .completed]
    }

    // Next actionable status in the KDS for a given order's fulfillment type;
    // nil once the order is completed (final state).
    func next(for fulfillment: FulfillmentType) -> OrderStatus? {
        switch self {
        case .paid: return .inProduction
        case .inProduction: return .labeling
        case .labeling: return fulfillment == .pickup ? .readyForHandover : .shipped
        case .readyForHandover, .shipped: return .completed
        case .completed: return nil
        }
    }

    func previous(for fulfillment: FulfillmentType) -> OrderStatus? {
        switch self {
        case .paid: return nil
        case .inProduction: return .paid
        case .labeling: return .inProduction
        case .readyForHandover, .shipped: return .labeling
        case .completed: return fulfillment == .pickup ? .readyForHandover : .shipped
        }
    }
}

struct CustomerDetails: Codable, Equatable {
    var name: String = ""
    var email: String = ""
    var street: String = ""
    var postalCode: String = ""
    var city: String = ""
    var country: DACHCountry = .ch
}

struct Order: Identifiable, Codable {
    let id: String
    let orderNumber: String
    let producerId: String
    let producerName: String
    let customer: CustomerDetails
    let items: [CartItem]
    var status: OrderStatus
    let fulfillmentType: FulfillmentType
    let subtotal: Double
    let taxRate: Double
    let taxAmount: Double
    let totalAmount: Double
    let paymentMethod: String
    let createdAt: Date
    let scheduledBatchDate: String
    var isGift: Bool = false
    var giftMessage: String = ""
    var quoteId: String?
}

// MARK: - VAT helper (single source of truth, mirrors the web app's
// calculateOrderTotals: prices are always gross/VAT-inclusive — this only
// splits the gross amount into its net + tax components).
struct OrderTotals {
    let taxRate: Double
    let subtotal: Double
    let taxAmount: Double
    let total: Double
}

func calculateOrderTotals(grossTotal: Double, country: DACHCountry) -> OrderTotals {
    let rate = country.vatRate
    let tax = grossTotal * (rate / (1 + rate))
    return OrderTotals(taxRate: rate, subtotal: grossTotal, taxAmount: tax, total: grossTotal)
}

// MARK: - Quote / Offerte -> Rechnung flow (platform never touches this money)
enum QuoteStatus: String, Codable {
    case requested, quoted, declined, accepted, invoiced, paid

    var title: String {
        switch self {
        case .requested: return "Warten auf Offerte"
        case .quoted: return "Offerte erhalten"
        case .declined: return "Abgelehnt"
        case .accepted: return "Angenommen"
        case .invoiced: return "Rechnung offen"
        case .paid: return "Bezahlt"
        }
    }
}

struct QuoteItem: Identifiable, Codable {
    var id: String = UUID().uuidString
    var productTitle: String
    var quantity: Int
}

struct Quote: Identifiable, Codable {
    let id: String
    let quoteNumber: String
    let producerId: String
    let producerName: String
    var customer: CustomerDetails
    var items: [QuoteItem]
    var customerNote: String
    var selectedTasteTags: [String]?
    var bespokeDescription: String?
    var customFieldValues: [String: String]?
    var status: QuoteStatus
    var quotedPrice: Double?
    var quotedNote: String?
    let createdAt: Date
}

struct Invoice: Identifiable, Codable {
    let id: String
    let invoiceNumber: String
    let quoteId: String
    let producerId: String
    let amount: Double
    let dueDate: String
    let qrReference: String
    var status: String // "open" | "paid"
    let createdAt: Date
}
