import SwiftUI

struct ProducerPortalView: View {
    @EnvironmentObject var store: AtelierStore
    @State private var portalSection: Int = 0 // 0: KDS Orders, 1: Custom MTO Produkte, 2: Standard-Sortiment
    @State private var showingNewBusinessSheet: Bool = false
    
    // New Business Form State
    @State private var newBizName: String = ""
    @State private var newBizTagline: String = ""
    @State private var newBizCity: String = "Zürich"
    @State private var newBizCategory: CraftCategory = .coffee
    @State private var newBizCountry: DACHCountry = .ch
    @State private var newBizVat: String = "CHE-123.456.789 MWST"
    @State private var newBizLeadTime: String = "Röstung dienstags, Versand mittwochs"
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    
                    // Business Header & Selector
                    if let producer = store.selectedProducer {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Circle().fill(Color.green).frame(width: 8, height: 8)
                                Text("PRODUZENTEN-WORKSPACE")
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .foregroundColor(.secondary)
                                Spacer()
                                Button(action: {
                                    showingNewBusinessSheet = true
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "plus")
                                        Text("Neues Gewerbe")
                                    }
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Color(red: 0.61, green: 0.29, blue: 0.18))
                                    .cornerRadius(6)
                                }
                            }
                            
                            HStack {
                                Text(producer.name)
                                    .font(.system(size: 22, weight: .bold))
                                Spacer()
                                Text("\(producer.city), \(producer.country.rawValue)")
                                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                                    .foregroundColor(.secondary)
                            }
                            
                            // Multi-business picker
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(store.producers) { p in
                                        let isSelected = p.id == producer.id
                                        Button(action: {
                                            store.selectedProducer = p
                                            store.triggerHapticFeedback()
                                        }) {
                                            Text(p.name)
                                                .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                                                .foregroundColor(isSelected ? .white : .primary)
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 6)
                                                .background(isSelected ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                                .cornerRadius(8)
                                        }
                                    }
                                }
                            }
                        }
                        .padding()
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(14)
                        .padding(.horizontal)
                    }
                    
                    // Section Selector: KDS vs Custom MTO vs Standard Sortiment
                    Picker("Bereich", selection: $portalSection) {
                        Text("1. KDS Aufträge").tag(0)
                        Text("2. MTO Canvas").tag(1)
                        Text("3. Standards").tag(2)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)
                    
                    // SECTION 0: KDS Production Queue
                    if portalSection == 0 {
                        let orders = store.orders.filter { $0.producerId == store.selectedProducer?.id }
                        if orders.isEmpty {
                            Text("Keine aktiven Aufträge in der KDS-Queue.")
                                .font(.system(size: 13, design: .monospaced))
                                .foregroundColor(.secondary)
                                .padding(.top, 40)
                        } else {
                            ForEach(orders) { order in
                                VStack(alignment: .leading, spacing: 10) {
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
                                }
                                .padding()
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                    // SECTION 1: Made-to-Order Custom Products
                    if portalSection == 1 {
                        let mtoProducts = store.products.filter { $0.producerId == store.selectedProducer?.id && $0.isCustomizable }
                        VStack(alignment: .leading, spacing: 12) {
                            Text("MADE-TO-ORDER PRODUKTE MIT SCHIEBER-CANVAS")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                                .padding(.horizontal)
                            
                            ForEach(mtoProducts) { prod in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(prod.title)
                                            .font(.system(size: 15, weight: .bold))
                                        Spacer()
                                        Text(String(format: "CHF %.2f", prod.basePrice))
                                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                                    }
                                    
                                    if let cfg = prod.config {
                                        Text("\(cfg.sliderTitle) · \(cfg.components.count) Schieber aktiv")
                                            .font(.system(size: 11, design: .monospaced))
                                            .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                        
                                        ForEach(cfg.components) { comp in
                                            HStack {
                                                Circle().fill(Color(hex: comp.hexColor)).frame(width: 6, height: 6)
                                                Text(comp.name).font(.system(size: 11))
                                                Spacer()
                                                Text("Faktor \(String(format: "%.2f", comp.priceMultiplier))x").font(.system(size: 10, design: .monospaced))
                                            }
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
                    
                    // SECTION 2: Standard Sortiment Products
                    if portalSection == 2 {
                        let standardProducts = store.products.filter { $0.producerId == store.selectedProducer?.id && !$0.isCustomizable }
                        VStack(alignment: .leading, spacing: 12) {
                            Text("STANDARDSORTIMENT DER MANUFAKTUR")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                                .padding(.horizontal)
                            
                            ForEach(standardProducts) { prod in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(prod.title)
                                            .font(.system(size: 14, weight: .bold))
                                        Text("Lagerbestand: \(prod.stockQuantity ?? 0) Stk. · \(prod.unitText)")
                                            .font(.system(size: 11, design: .monospaced))
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Text(String(format: "CHF %.2f", prod.basePrice))
                                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                                }
                                .padding()
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(12)
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                }
                .padding(.vertical)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Werkstatt-Portal")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingNewBusinessSheet) {
                NavigationView {
                    Form {
                        Section(header: Text("Gewerbe-Stammdaten")) {
                            TextField("Betriebsname (z.B. Alpine Roasters)", text: $newBizName)
                            TextField("Slogan / Tagline", text: $newBizTagline)
                            TextField("Stadt / Standort", text: $newBizCity)
                            Picker("Kategorie", selection: $newBizCategory) {
                                ForEach(CraftCategory.allCases) { cat in
                                    Text(cat.displayName).tag(cat)
                                }
                            }
                        }
                        
                        Section(header: Text("Rechtliches & Rhythmus")) {
                            TextField("MwSt.-Nummer", text: $newBizVat)
                            TextField("Produktions-Rhythmus", text: $newBizLeadTime)
                        }
                    }
                    .navigationTitle("Neues Gewerbe")
                    .navigationBarItems(
                        leading: Button("Abbrechen") { showingNewBusinessSheet = false },
                        trailing: Button("Erstellen") {
                            if !newBizName.isEmpty {
                                _ = store.createProducer(
                                    name: newBizName,
                                    category: newBizCategory,
                                    city: newBizCity,
                                    country: newBizCountry,
                                    tagline: newBizTagline.isEmpty ? "Manufaktur & Made-to-Order" : newBizTagline,
                                    vatNumber: newBizVat,
                                    leadTimeSchedule: newBizLeadTime
                                )
                                showingNewBusinessSheet = false
                            }
                        }
                    )
                }
            }
        }
    }
}
