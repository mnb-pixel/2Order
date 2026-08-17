import SwiftUI

struct ProducerDetailView: View {
    @EnvironmentObject var store: AtelierStore
    let producer: Producer
    
    @State private var selectedStandardProduct: Product? = nil
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                
                // Hero Header (using local asset with name normalization)
                ZStack(alignment: .bottomLeading) {
                    Image(producer.heroImageUrl.replacingOccurrences(of: "/images/", with: "").replacingOccurrences(of: ".jpg", with: ""))
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 220)
                        .overlay(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.clear, Color.black.opacity(0.85)]),
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .clipped()
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(producer.category.rawValue.uppercased()) · EST. \(producer.establishedYear)")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(white: 0.8))
                        
                        Text(producer.name)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text("\"\(producer.tagline)\"")
                            .font(.system(size: 13, design: .serif))
                            .italic()
                            .foregroundColor(Color(white: 0.9))
                    }
                    .padding()
                }
                
                // Bio & Schedule
                VStack(alignment: .leading, spacing: 12) {
                    Text(producer.bio)
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                        .lineSpacing(3)
                    
                    HStack(spacing: 16) {
                        HStack(spacing: 6) {
                            Image(systemName: "clock")
                                .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                            Text(producer.leadTimeSchedule)
                                .font(.system(size: 11, weight: .medium))
                        }
                        
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundColor(.green)
                            Text(producer.vatNumber)
                                .font(.system(size: 11, weight: .medium))
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(.horizontal)
                
                // 1. Made-to-Order Products
                let customizable = store.products.filter { $0.producerId == producer.id && $0.isCustomizable }
                if !customizable.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Circle()
                                .fill(Color(red: 0.61, green: 0.29, blue: 0.18))
                                .frame(width: 8, height: 8)
                            Text("1. MADE-TO-ORDER & SONDERANFERTIGUNG")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal)
                        
                        ForEach(customizable) { product in
                            NavigationLink(destination: BlendCustomizerView(product: product, producer: producer)) {
                                VStack(alignment: .leading, spacing: 12) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(product.title)
                                                .font(.system(size: 16, weight: .bold))
                                                .foregroundColor(.primary)
                                            Text(product.description)
                                                .font(.system(size: 12))
                                                .foregroundColor(.secondary)
                                                .lineLimit(2)
                                        }
                                        Spacer()
                                        Text("\(producer.currency) \(String(format: "%.2f", product.basePrice))")
                                            .font(.system(size: 15, weight: .bold, design: .monospaced))
                                            .foregroundColor(.primary)
                                    }
                                    
                                    HStack {
                                        Image(systemName: "slider.horizontal.3")
                                        Text("Rezeptur & Etikett mischen")
                                            .font(.system(size: 12, weight: .bold))
                                    }
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(Color.black)
                                    .cornerRadius(8)
                                }
                                .padding()
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.black, lineWidth: 1.5)
                                )
                                .cornerRadius(12)
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                
                // 2. Standard Catalogue Products (Click opens ProductInfoSheet)
                let standards = store.products.filter { $0.producerId == producer.id && !$0.isCustomizable }
                if !standards.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("2. STANDARDSORTIMENT")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        
                        ForEach(standards) { prod in
                            Button(action: {
                                selectedStandardProduct = prod
                                store.triggerHapticFeedback()
                            }) {
                                HStack(spacing: 12) {
                                    Image(prod.imageUrl.replacingOccurrences(of: "/images/", with: "").replacingOccurrences(of: ".jpg", with: ""))
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 65, height: 65)
                                        .cornerRadius(8)
                                        .clipped()
                                        .background(Color(white: 0.2))
                                    
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(prod.title)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(.primary)
                                        Text(prod.subtitle)
                                            .font(.system(size: 11))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                        Text(prod.unitText)
                                            .font(.system(size: 10, design: .monospaced))
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    VStack(alignment: .trailing, spacing: 4) {
                                        Text("\(producer.currency) \(String(format: "%.2f", prod.basePrice))")
                                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                                            .foregroundColor(.primary)
                                        
                                        Image(systemName: "info.circle")
                                            .font(.system(size: 14))
                                            .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                    }
                                }
                                .padding(12)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                
            }
            .padding(.bottom, 30)
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle(producer.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedStandardProduct) { prod in
            ProductInfoSheet(product: prod, producer: producer)
        }
    }
}
