import SwiftUI

struct DiscoverView: View {
    @EnvironmentObject var store: AtelierStore
    @State private var selectedCategory: CraftCategory? = nil
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    
                    // Header Tagline
                    VStack(alignment: .leading, spacing: 6) {
                        Text("DACH DIRECT-TO-CONSUMER & CRAFTING")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                        
                        Text("Handwerk auf Bestellung.")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(.primary)
                        
                        Text("Massgeschneidert für Kenner.")
                            .font(.system(size: 22, weight: .regular, design: .serif))
                            .italic()
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    
                    // Category Filter Pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            Button(action: {
                                selectedCategory = nil
                                store.triggerHapticFeedback()
                            }) {
                                Text("Alle Ateliers")
                                    .font(.system(size: 12, weight: selectedCategory == nil ? .bold : .medium))
                                    .foregroundColor(selectedCategory == nil ? .white : .primary)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(selectedCategory == nil ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                    .cornerRadius(20)
                            }
                            
                            ForEach(CraftCategory.allCases) { cat in
                                let isSelected = selectedCategory == cat
                                Button(action: {
                                    selectedCategory = cat
                                    store.triggerHapticFeedback()
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: cat.iconName)
                                            .font(.system(size: 11))
                                        Text(cat.displayName)
                                            .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                    }
                                    .foregroundColor(isSelected ? .white : .primary)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(isSelected ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                    .cornerRadius(20)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Featured Made-to-Order Canvas Card
                    VStack(alignment: .leading, spacing: 12) {
                        Text("★ JETZT INDIVIDUELL KREIEREN")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        
                        if let customProduct = store.products.first(where: { $0.isCustomizable }),
                           let producer = store.producers.first(where: { $0.id == customProduct.producerId }) {
                            NavigationLink(destination: BlendCustomizerView(product: customProduct, producer: producer)) {
                                VStack(alignment: .leading, spacing: 10) {
                                    ZStack(alignment: .topLeading) {
                                        AsyncImage(url: URL(string: customProduct.imageUrl)) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                        } placeholder: {
                                            Rectangle()
                                                .fill(Color(white: 0.9))
                                        }
                                        .frame(height: 180)
                                        .clipped()
                                        
                                        HStack {
                                            Text("✦ MADE-TO-ORDER")
                                                .font(.system(size: 9, weight: .bold, design: .monospaced))
                                                .foregroundColor(.white)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(Color.black.opacity(0.85))
                                                .cornerRadius(4)
                                            
                                            Spacer()
                                            
                                            Text("ab \(producer.currency) \(String(format: "%.2f", customProduct.basePrice))")
                                                .font(.system(size: 12, weight: .bold))
                                                .foregroundColor(.black)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(Color.white.opacity(0.95))
                                                .cornerRadius(6)
                                        }
                                        .padding(12)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("\(producer.name) · \(producer.city)")
                                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                                            .foregroundColor(.secondary)
                                        
                                        Text(customProduct.title)
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundColor(.primary)
                                        
                                        Text(customProduct.subtitle)
                                            .font(.system(size: 12))
                                            .foregroundColor(.secondary)
                                            .lineLimit(2)
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.bottom, 14)
                                }
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(16)
                                .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 4)
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Producers Directory
                    VStack(alignment: .leading, spacing: 12) {
                        Text("PARTNER-MANUFAKTUREN")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        
                        let filtered = selectedCategory == nil ? store.producers : store.producers.filter { $0.category == selectedCategory }
                        
                        ForEach(filtered) { producer in
                            NavigationLink(destination: ProducerDetailView(producer: producer)) {
                                HStack(spacing: 14) {
                                    AsyncImage(url: URL(string: producer.heroImageUrl)) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Rectangle()
                                            .fill(Color(white: 0.9))
                                    }
                                    .frame(width: 70, height: 70)
                                    .cornerRadius(10)
                                    .clipped()
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text(producer.name)
                                                .font(.system(size: 15, weight: .bold))
                                                .foregroundColor(.primary)
                                            
                                            Spacer()
                                            
                                            Text("\(producer.city), \(producer.country.rawValue)")
                                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                                .foregroundColor(.secondary)
                                        }
                                        
                                        Text(producer.tagline)
                                            .font(.system(size: 11, design: .serif))
                                            .italic()
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                        
                                        Text(producer.leadTimeSchedule)
                                            .font(.system(size: 10, design: .monospaced))
                                            .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                            .lineLimit(1)
                                    }
                                }
                                .padding(12)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                }
                .padding(.vertical)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("ATELIER")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
