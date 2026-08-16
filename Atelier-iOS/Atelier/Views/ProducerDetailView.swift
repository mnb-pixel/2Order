import SwiftUI

struct ProducerDetailView: View {
    @EnvironmentObject var store: AtelierStore
    let producer: Producer
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                
                // Hero Header
                ZStack(alignment: .bottomLeading) {
                    AsyncImage(url: URL(string: producer.heroImageUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color(white: 0.2))
                    }
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
                
                // Made-to-Order Products
                let customizable = store.products.filter { $0.producerId == producer.id && $0.isCustomizable }
                if !customizable.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Circle()
                                .fill(Color(red: 0.61, green: 0.29, blue: 0.18))
                                .frame(width: 8, height: 8)
                            Text("MADE-TO-ORDER & SONDERANFERTIGUNG")
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
                
                // Standard Catalogue Products
                let standards = store.products.filter { $0.producerId == producer.id && !$0.isCustomizable }
                if !standards.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("STANDARDSORTIMENT")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        
                        ForEach(standards) { prod in
                            HStack(spacing: 12) {
                                AsyncImage(url: URL(string: prod.imageUrl)) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Rectangle().fill(Color(white: 0.9))
                                }
                                .frame(width: 60, height: 60)
                                .cornerRadius(8)
                                .clipped()
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(prod.title)
                                        .font(.system(size: 14, weight: .semibold))
                                    Text(prod.subtitle)
                                        .font(.system(size: 11))
                                        .foregroundColor(.secondary)
                                        .lineLimit(1)
                                }
                                
                                Spacer()
                                
                                Button(action: {
                                    store.addToCart(CartItem(product: prod, producer: producer, quantity: 1, unitPrice: prod.basePrice))
                                }) {
                                    Image(systemName: "bag.badge.plus")
                                        .font(.system(size: 14))
                                        .foregroundColor(.black)
                                        .padding(10)
                                        .background(Color(UIColor.tertiarySystemGroupedBackground))
                                        .cornerRadius(8)
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
            .padding(.bottom, 30)
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle(producer.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
