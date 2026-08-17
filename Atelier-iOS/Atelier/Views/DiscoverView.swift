import SwiftUI

struct DiscoverView: View {
    @EnvironmentObject var store: AtelierStore
    @State private var selectedCategory: CraftCategory? = nil
    
    var filteredProducers: [Producer] {
        if let cat = selectedCategory {
            return store.producers.filter { $0.category == cat }
        }
        return store.producers
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    
                    // Header Subtitle
                    VStack(alignment: .leading, spacing: 4) {
                        Text("HANDWERK AUF BESTELLUNG")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                        
                        Text("Frisch & individuell für Sie gefertigt.")
                            .font(.system(size: 15))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    
                    // Category Filter Chips
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            Button(action: {
                                selectedCategory = nil
                                store.triggerHapticFeedback()
                            }) {
                                HStack(spacing: 6) {
                                    Image(systemName: "sparkles")
                                    Text("Alle")
                                }
                                .font(.system(size: 12, weight: selectedCategory == nil ? .bold : .medium))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(selectedCategory == nil ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                .foregroundColor(selectedCategory == nil ? .white : .primary)
                                .cornerRadius(8)
                            }
                            
                            ForEach(CraftCategory.allCases) { cat in
                                let isSelected = selectedCategory == cat
                                Button(action: {
                                    selectedCategory = isSelected ? nil : cat
                                    store.triggerHapticFeedback()
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: cat.iconName)
                                        Text(cat.displayName)
                                    }
                                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(isSelected ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                    .foregroundColor(isSelected ? .white : .primary)
                                    .cornerRadius(8)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Producer Cards
                    VStack(spacing: 16) {
                        ForEach(filteredProducers) { producer in
                            NavigationLink(destination: ProducerDetailView(producer: producer)) {
                                VStack(alignment: .leading, spacing: 0) {
                                    
                                    // Hero Image (Local Asset)
                                    ZStack(alignment: .topTrailing) {
                                        Image(producer.heroImageUrl.replacingOccurrences(of: "/images/", with: "").replacingOccurrences(of: ".jpg", with: ""))
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(height: 180)
                                            .clipped()
                                            .background(Color(white: 0.2))
                                        
                                        // Badge
                                        Text(producer.category.rawValue.uppercased())
                                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color.black.opacity(0.75))
                                            .foregroundColor(.white)
                                            .cornerRadius(4)
                                            .padding(12)
                                    }
                                    
                                    // Content
                                    VStack(alignment: .leading, spacing: 6) {
                                        HStack {
                                            Text(producer.name)
                                                .font(.system(size: 17, weight: .bold))
                                                .foregroundColor(.primary)
                                            Spacer()
                                            Text("\(producer.city), \(producer.country.rawValue)")
                                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                                .foregroundColor(.secondary)
                                        }
                                        
                                        Text(producer.tagline)
                                            .font(.system(size: 12, design: .serif))
                                            .italic()
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                        
                                        HStack(spacing: 12) {
                                            HStack(spacing: 4) {
                                                Image(systemName: "clock")
                                                    .font(.system(size: 10))
                                                    .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                                Text(producer.leadTimeSchedule)
                                                    .font(.system(size: 10, design: .monospaced))
                                                    .foregroundColor(.secondary)
                                                    .lineLimit(1)
                                            }
                                        }
                                        .padding(.top, 4)
                                    }
                                    .padding(14)
                                    .background(Color(UIColor.secondarySystemGroupedBackground))
                                }
                                .cornerRadius(14)
                                .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 3)
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                }
                .padding(.vertical)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Atelier Manufakturen")
        }
    }
}
