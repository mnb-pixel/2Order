import SwiftUI

struct ProducerPortalView: View {
    @EnvironmentObject var store: AtelierStore
    @State private var selectedStatusFilter: OrderStatus? = nil
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    
                    // Portal Header
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Circle().fill(Color.green).frame(width: 8, height: 8)
                            Text("WERKSTATT & KDS DISPLAY")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                        
                        Text("Produktions-Queue")
                            .font(.system(size: 24, weight: .bold))
                        
                        Text("Verwalten Sie aktuelle Röstchargen & MTO-Aufträge")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    
                    // Status Filter Tabs
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            Button(action: {
                                selectedStatusFilter = nil
                                store.triggerHapticFeedback()
                            }) {
                                Text("Alle (\(store.orders.count))")
                                    .font(.system(size: 11, weight: selectedStatusFilter == nil ? .bold : .medium))
                                    .foregroundColor(selectedStatusFilter == nil ? .white : .primary)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(selectedStatusFilter == nil ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                    .cornerRadius(16)
                            }
                            
                            ForEach(OrderStatus.allCases, id: \.self) { st in
                                let count = store.orders.filter { $0.status == st }.count
                                let isSelected = selectedStatusFilter == st
                                Button(action: {
                                    selectedStatusFilter = st
                                    store.triggerHapticFeedback()
                                }) {
                                    Text("\(st.title) (\(count))")
                                        .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                                        .foregroundColor(isSelected ? .white : .primary)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(isSelected ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                        .cornerRadius(16)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Orders List
                    let filtered = selectedStatusFilter == nil ? store.orders : store.orders.filter { $0.status == selectedStatusFilter }
                    
                    if filtered.isEmpty {
                        Text("Keine Aufträge in dieser Phase.")
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundColor(.secondary)
                            .padding(.top, 40)
                    } else {
                        ForEach(filtered) { order in
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("#\(order.orderNumber) · \(order.customerName)")
                                            .font(.system(size: 14, weight: .bold))
                                        Text("\(order.customerCity) · \(order.paymentMethod)")
                                            .font(.system(size: 11, design: .monospaced))
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Text(order.status.title)
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color(red: 0.61, green: 0.29, blue: 0.18).opacity(0.12))
                                        .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                        .cornerRadius(4)
                                }
                                
                                // Recipe details
                                ForEach(order.items) { item in
                                    if let recipe = item.recipe {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("REZEPTUR ZUM EINWÄGEN (\(item.product.weightGrams)g):")
                                                .font(.system(size: 9, weight: .bold, design: .monospaced))
                                                .foregroundColor(.secondary)
                                            
                                            ForEach(recipe) { r in
                                                HStack {
                                                    Text(r.componentName)
                                                        .font(.system(size: 11))
                                                    Spacer()
                                                    Text("\(r.ratio)% (\(r.grams)g)")
                                                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                                                }
                                            }
                                        }
                                        .padding(8)
                                        .background(Color(UIColor.tertiarySystemGroupedBackground))
                                        .cornerRadius(6)
                                    }
                                }
                                
                                // Status Advance Button
                                HStack {
                                    Spacer()
                                    Button(action: {
                                        advanceStatus(for: order)
                                    }) {
                                        HStack(spacing: 4) {
                                            Text("Status vorrücken")
                                            Image(systemName: "arrow.right")
                                        }
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.black)
                                        .cornerRadius(6)
                                    }
                                }
                            }
                            .padding()
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(12)
                            .padding(.horizontal)
                        }
                    }
                    
                }
                .padding(.vertical)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Produzenten-Portal")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func advanceStatus(for order: Order) {
        let next: OrderStatus
        switch order.status {
        case .paid: next = .inProduction
        case .inProduction: next = .labeling
        case .labeling: next = .ready
        case .ready: next = .shipped
        case .shipped: next = .shipped
        }
        store.updateOrderStatus(orderId: order.id, newStatus: next)
    }
}
