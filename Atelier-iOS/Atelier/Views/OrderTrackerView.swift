import SwiftUI

struct OrderTrackerView: View {
    @EnvironmentObject var store: AtelierStore
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if store.orders.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "tray")
                                .font(.system(size: 40))
                                .foregroundColor(.secondary)
                            Text("Noch keine Bestellungen vorhanden.")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 80)
                    } else {
                        ForEach(store.orders) { order in
                            VStack(alignment: .leading, spacing: 16) {
                                // Order Header
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("AUFTRAG #\(order.orderNumber)")
                                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                                            .foregroundColor(.secondary)
                                        Text(order.producerName)
                                            .font(.system(size: 16, weight: .bold))
                                    }
                                    Spacer()
                                    Text(String(format: "CHF %.2f", order.totalAmount))
                                        .font(.system(size: 15, weight: .bold, design: .monospaced))
                                }
                                
                                Divider()
                                
                                // Status Stepper
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("PRODUKTIONSSTATUS")
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .foregroundColor(.secondary)
                                    
                                    ForEach(OrderStatus.allCases, id: \.self) { st in
                                        let isDone = st.stepIndex <= order.status.stepIndex
                                        let isCurrent = st == order.status
                                        
                                        HStack(spacing: 12) {
                                            Circle()
                                                .fill(isCurrent ? Color(red: 0.61, green: 0.29, blue: 0.18) : isDone ? Color.black : Color(white: 0.85))
                                                .frame(width: 10, height: 10)
                                            
                                            Text(st.title)
                                                .font(.system(size: 12, weight: isCurrent ? .bold : .regular))
                                                .foregroundColor(isCurrent ? .primary : isDone ? .secondary : Color(white: 0.6))
                                            
                                            Spacer()
                                            
                                            if isCurrent {
                                                Text("AKTUELL")
                                                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                                                    .foregroundColor(.white)
                                                    .padding(.horizontal, 6)
                                                    .padding(.vertical, 2)
                                                    .background(Color(red: 0.61, green: 0.29, blue: 0.18))
                                                    .cornerRadius(3)
                                            }
                                        }
                                    }
                                }
                                
                                // Items Breakdown
                                ForEach(order.items) { item in
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text("\(item.quantity)x \(item.product.title)")
                                            .font(.system(size: 13, weight: .semibold))
                                        
                                        if let label = item.customLabel {
                                            Text("\"\(label.headline)\"")
                                                .font(.system(size: 11, design: .serif))
                                                .italic()
                                                .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                        }
                                        
                                        if let recipe = item.recipe {
                                            Text(recipe.map { "\($0.ratio)% \($0.componentName)" }.joined(separator: " · "))
                                                .font(.system(size: 10, design: .monospaced))
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    .padding(10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color(UIColor.tertiarySystemGroupedBackground))
                                    .cornerRadius(8)
                                }
                                
                            }
                            .padding()
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(14)
                            .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                        }
                    }
                }
                .padding()
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Aufträge")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
