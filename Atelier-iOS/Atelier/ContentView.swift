import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: AtelierStore
    @State private var showingCheckout: Bool = false
    
    var body: some View {
        TabView(selection: $store.selectedTab) {
            
            // Tab 1: Discover
            DiscoverView()
                .tabItem {
                    Image(systemName: "sparkles")
                    Text("Entdecken")
                }
                .tag(0)
            
            // Tab 2: Cart
            NavigationView {
                VStack {
                    if store.cart.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "bag")
                                .font(.system(size: 44))
                                .foregroundColor(.secondary)
                            Text("Ihr Warenkorb ist leer.")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    } else {
                        List {
                            ForEach(store.cart) { item in
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Text(item.product.title)
                                            .font(.system(size: 14, weight: .bold))
                                        Spacer()
                                        Text(String(format: "CHF %.2f", item.totalPrice))
                                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    }
                                    
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
                                .padding(.vertical, 4)
                            }
                            .onDelete(perform: store.removeFromCart)
                        }
                        
                        VStack(spacing: 12) {
                            HStack {
                                Text("Gesamtbetrag (inkl. MwSt.)")
                                    .font(.system(size: 14))
                                Spacer()
                                Text(String(format: "CHF %.2f", store.cartTotal))
                                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                            }
                            .padding(.horizontal)
                            
                            Button(action: {
                                showingCheckout = true
                            }) {
                                HStack {
                                    Image(systemName: "lock.fill")
                                    Text("Zur Kasse gehen")
                                        .font(.system(size: 14, weight: .bold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.black)
                                .cornerRadius(12)
                            }
                            .padding(.horizontal)
                        }
                        .padding(.bottom)
                    }
                }
                .navigationTitle("Warenkorb")
                .sheet(isPresented: $showingCheckout) {
                    CheckoutView()
                }
            }
            .tabItem {
                Image(systemName: "bag")
                Text("Warenkorb")
            }
            .badge(store.cart.count)
            .tag(1)
            
            // Tab 3: Orders
            OrderTrackerView()
                .tabItem {
                    Image(systemName: "clock.arrow.circlepath")
                    Text("Aufträge")
                }
                .badge(store.orders.count)
                .tag(2)

            // Tab 4: Quote requests (Anfrage -> Offerte -> Rechnung)
            MyQuotesView()
                .tabItem {
                    Image(systemName: "doc.text")
                    Text("Anfragen")
                }
                .badge(store.quotes.filter { $0.status == .quoted }.count)
                .tag(3)

            // Tab 5: Producer KDS Workshop
            ProducerPortalView()
                .tabItem {
                    Image(systemName: "wrench.and.screwdriver")
                    Text("Werkstatt")
                }
                .tag(4)
        }
        .accentColor(.black)
    }
}
