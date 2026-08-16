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

enum DACHCountry: String, Codable {
    case ch = "CH"
    case de = "DE"
    case at = "AT"
    
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
}

// MARK: - Producer Model (Gewerbe)
struct Producer: Identifiable, Codable {
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
}

// MARK: - Dynamic Custom Option Choice
struct OptionChoice: Identifiable, Codable {
    var id: String { value }
    var label: String
    var value: String
    var priceDelta: Double?
}

struct CustomizationOption: Identifiable, Codable {
    var id: String { key }
    var key: String
    var title: String
    var defaultValue: String
    var values: [OptionChoice]
}

// MARK: - Manufacturer Label Config
struct ManufacturerLabelConfig: Codable {
    var allowed: Bool
    var headlinePlaceholder: String
    var maxHeadlineLength: Int
    var allowDedication: Bool
    var maxDedicationLength: Int
    var fixedBrandStamp: String
}

// MARK: - Customization Config
struct CustomizationConfig: Identifiable, Codable {
    var id: String
    var productId: String
    var sliderTitle: String
    var totalWeightGrams: Int
    var components: [BlendComponent]
    var options: [CustomizationOption]
    var labelConfig: ManufacturerLabelConfig
}

// MARK: - Product Model (Standard vs Custom)
struct Product: Identifiable, Codable {
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
    var customLabel: CustomLabelData?
    
    var totalPrice: Double {
        unitPrice * Double(quantity)
    }
}

// MARK: - Order Model
enum OrderStatus: String, Codable, CaseIterable {
    case paid = "paid"
    case inProduction = "in_production"
    case labeling = "labeling"
    case ready = "ready"
    case shipped = "shipped"
    
    var title: String {
        switch self {
        case .paid: return "Bezahlt & Eingeplant"
        case .inProduction: return "In Röstung / Produktion"
        case .labeling: return "Etikettierung & Kontrolle"
        case .ready: return "Bereit zur Abholung"
        case .shipped: return "Versendet mit Frischegarantie"
        }
    }
    
    var stepIndex: Int {
        switch self {
        case .paid: return 0
        case .inProduction: return 1
        case .labeling: return 2
        case .ready, .shipped: return 3
        }
    }
}

struct Order: Identifiable, Codable {
    let id: String
    let orderNumber: String
    let producerId: String
    let producerName: String
    let customerName: String
    let customerEmail: String
    let customerStreet: String
    let customerCity: String
    let customerPostalCode: String
    let customerCountry: DACHCountry
    let items: [CartItem]
    var status: OrderStatus
    let totalAmount: Double
    let paymentMethod: String
    let createdAt: Date
    let scheduledBatchDate: String
}
