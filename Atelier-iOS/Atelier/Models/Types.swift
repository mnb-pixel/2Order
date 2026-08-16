import Foundation
import SwiftUI

// MARK: - Category & Country Enums
enum CraftCategory: String, CaseIterable, Codable, Identifiable {
    case coffee = "coffee"
    case beer = "beer"
    case chocolate = "chocolate"
    case spirits = "spirits"
    case iceCream = "ice_cream"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .coffee: return "Röstereien"
        case .beer: return "Brauereien"
        case .chocolate: return "Chocolatiers"
        case .spirits: return "Destillerien"
        case .iceCream: return "Eismanufaktur"
        }
    }
    
    var iconName: String {
        switch self {
        case .coffee: return "cup.and.saucer.fill"
        case .beer: return "mug.fill"
        case .chocolate: return "sparkles"
        case .spirits: return "flame.fill"
        case .iceCream: return "takeoutbag.and.cup.and.straw.fill"
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

// MARK: - Producer Model
struct Producer: Identifiable, Codable {
    let id: String
    let name: String
    let tagline: String
    let category: CraftCategory
    let country: DACHCountry
    let city: String
    let currency: String
    let bio: String
    let heroImageUrl: String
    let vatNumber: String
    let leadTimeSchedule: String
    let batchScheduleNotice: String
    let establishedYear: Int
}

// MARK: - Blend Component
struct BlendComponent: Identifiable, Codable, Equatable {
    let id: String
    let name: String
    let origin: String
    let process: String
    let notes: [String]
    let priceMultiplier: Double
    let hexColor: String
}

// MARK: - Variant Option
struct OptionChoice: Identifiable, Codable {
    var id: String { value }
    let label: String
    let value: String
    let priceDelta: Double?
}

struct CustomizationOption: Identifiable, Codable {
    var id: String { key }
    let key: String
    let title: String
    let defaultValue: String
    let values: [OptionChoice]
}

// MARK: - Customization Config
struct CustomizationConfig: Identifiable, Codable {
    let id: String
    let productId: String
    let totalWeightGrams: Int
    let components: [BlendComponent]
    let options: [CustomizationOption]
    let maxTitleLength: Int
    let maxDedicationLength: Int
}

// MARK: - Product Model
struct Product: Identifiable, Codable {
    let id: String
    let producerId: String
    let title: String
    let subtitle: String
    let description: String
    let category: CraftCategory
    let basePrice: Double
    let unitText: String
    let weightGrams: Int
    let isCustomizable: Bool
    let imageUrl: String
    let tags: [String]
    let config: CustomizationConfig?
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
    var fontStyle: String // "swiss-sans", "editorial-serif", "minimal-mono"
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
