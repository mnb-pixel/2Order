import SwiftUI

struct ProductInfoSheet: View {
    @EnvironmentObject var store: AtelierStore
    @Environment(\.presentationMode) var presentationMode
    
    let product: Product
    let producer: Producer
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    
                    // Product Hero Image (Local Asset with fallback)
                    ZStack(alignment: .topTrailing) {
                        Image(product.imageUrl.replacingOccurrences(of: "/images/", with: "").replacingOccurrences(of: ".jpg", with: ""))
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(height: 260)
                            .clipped()
                            .background(Color(white: 0.15))
                    }
                    .frame(maxWidth: .infinity)
                    
                    VStack(alignment: .leading, spacing: 14) {
                        
                        // Category & Tags
                        HStack(spacing: 8) {
                            Text(producer.name.uppercased())
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                            
                            Spacer()
                            
                            Text(product.unitText)
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(6)
                        }
                        
                        // Title & Price
                        HStack(alignment: .top) {
                            Text(product.title)
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            Text(String(format: "%@ %.2f", producer.currency, product.basePrice))
                                .font(.system(size: 20, weight: .bold, design: .monospaced))
                                .foregroundColor(.primary)
                        }
                        
                        // Subtitle
                        Text(product.subtitle)
                            .font(.system(size: 14, design: .serif))
                            .italic()
                            .foregroundColor(.secondary)
                        
                        Divider()
                        
                        // Description
                        Text("BESCHREIBUNG")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                        
                        Text(product.description)
                            .font(.system(size: 13))
                            .lineSpacing(4)
                            .foregroundColor(.primary)
                        
                        // Stock / Freshness badge
                        HStack(spacing: 12) {
                            HStack(spacing: 6) {
                                Circle().fill(Color.green).frame(width: 8, height: 8)
                                Text("Lagernd (\(product.stockQuantity ?? 50) verfügbar)")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            
                            HStack(spacing: 6) {
                                Image(systemName: "clock")
                                    .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                Text(producer.leadTimeSchedule)
                                    .font(.system(size: 11, weight: .medium))
                                    .lineLimit(1)
                            }
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(8)
                        
                        // Add to Cart Action
                        Button(action: {
                            store.addToCart(CartItem(product: product, producer: producer, quantity: 1, unitPrice: product.basePrice))
                            presentationMode.wrappedValue.dismiss()
                        }) {
                            HStack {
                                Image(systemName: "bag.badge.plus")
                                Text("In den Warenkorb — \(String(format: "%@ %.2f", producer.currency, product.basePrice))")
                                    .font(.system(size: 14, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.black)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
                        }
                        .padding(.top, 10)
                        
                    }
                    .padding(.horizontal)
                    
                }
                .padding(.bottom, 24)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button(action: {
                presentationMode.wrappedValue.dismiss()
            }) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
                    .font(.system(size: 20))
            })
        }
    }
}
