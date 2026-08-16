import SwiftUI

struct BlendCustomizerView: View {
    @EnvironmentObject var store: AtelierStore
    @Environment(\.presentationMode) var presentationMode
    
    let product: Product
    let producer: Producer
    
    @State private var ratios: [String: Double] = [:]
    @State private var selectedOptions: [String: String] = [:]
    @State private var headline: String = "Mein Signature Blend"
    @State private var dedication: String = "Frisch geröstet für mich"
    @State private var fontStyle: String = "swiss-sans"
    @State private var selectedTab: Int = 0 // 0: Recipe, 1: Options, 2: Label
    @State private var showingAddedAlert: Bool = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                
                // Sticky Header Summary
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(producer.name.uppercased())
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(Color(white: 0.5))
                            Text(product.title)
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.primary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("Endpreis inkl. MwSt.")
                                .font(.system(size: 9, weight: .medium, design: .monospaced))
                                .foregroundColor(Color(white: 0.5))
                            Text(String(format: "%@ %.2f", producer.currency, calculatedPrice))
                                .font(.system(size: 18, weight: .bold, design: .monospaced))
                                .foregroundColor(.primary)
                        }
                    }
                }
                .padding()
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                
                // Segmented Picker
                Picker("Bereich", selection: $selectedTab) {
                    Text("1. Rezeptur (100%)").tag(0)
                    Text("2. Mahlgrad").tag(1)
                    Text("3. Etikett").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())
                
                // TAB 0: Recipe & 100% Locked Sliders
                if selectedTab == 0 {
                    if let config = product.config {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("PROZENTUALE MISCHUNG")
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundColor(.secondary)
                                Spacer()
                                Button("Gleichmässig") {
                                    resetEvenly(components: config.components)
                                }
                                .font(.system(size: 11, weight: .semibold))
                            }
                            
                            // Multi-Bar Preview
                            GeometryReader { geo in
                                HStack(spacing: 1) {
                                    ForEach(config.components) { comp in
                                        let ratio = ratios[comp.id] ?? 0
                                        if ratio > 0 {
                                            Rectangle()
                                                .fill(Color(hex: comp.hexColor))
                                                .frame(width: geo.size.width * CGFloat(ratio / 100.0))
                                        }
                                    }
                                }
                            }
                            .frame(height: 10)
                            .cornerRadius(5)
                            
                            // Component Sliders
                            ForEach(config.components) { comp in
                                let ratio = Int(ratios[comp.id] ?? 0)
                                let grams = Int(Double(ratio) / 100.0 * Double(config.totalWeightGrams))
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Circle()
                                            .fill(Color(hex: comp.hexColor))
                                            .frame(width: 8, height: 8)
                                        Text(comp.name)
                                            .font(.system(size: 13, weight: .semibold))
                                        Spacer()
                                        Text("\(ratio)% (\(grams)g)")
                                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    }
                                    
                                    Text("\(comp.origin) · \(comp.process)")
                                        .font(.system(size: 10))
                                        .foregroundColor(.secondary)
                                    
                                    Slider(
                                        value: Binding(
                                            get: { ratios[comp.id] ?? 0 },
                                            set: { newVal in
                                                updateRatio(for: comp.id, newValue: newVal, allComponents: config.components)
                                            }
                                        ),
                                        in: 0...100,
                                        step: 5
                                    )
                                    .accentColor(.black)
                                }
                                .padding(12)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                            }
                        }
                    }
                }
                
                // TAB 1: Mahlgrad & Options
                if selectedTab == 1 {
                    if let config = product.config {
                        VStack(alignment: .leading, spacing: 16) {
                            ForEach(config.options) { opt in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(opt.title.uppercased())
                                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                                        .foregroundColor(.secondary)
                                    
                                    ForEach(opt.values) { choice in
                                        let isSelected = selectedOptions[opt.key] == choice.value
                                        Button(action: {
                                            selectedOptions[opt.key] = choice.value
                                            store.triggerHapticFeedback()
                                        }) {
                                            HStack {
                                                Text(choice.label)
                                                    .font(.system(size: 13, weight: isSelected ? .bold : .regular))
                                                    .foregroundColor(isSelected ? .white : .primary)
                                                Spacer()
                                                if isSelected {
                                                    Image(systemName: "checkmark")
                                                        .foregroundColor(.white)
                                                }
                                            }
                                            .padding(12)
                                            .background(isSelected ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                            .cornerRadius(8)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // TAB 2: Custom Label
                if selectedTab == 2 {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("ETIKETTEN-PERSONALISIERUNG")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Titel des Blends")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                            TextField("z.B. Julians Morning Fuel", text: $headline)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Widmung / Notiz (Optional)")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                            TextField("z.B. Frisch geröstet für Zürich", text: $dedication)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                        
                        Text("SCHWEIZER TYPOGRAFIE")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                            .padding(.top, 4)
                        
                        HStack(spacing: 8) {
                            ForEach([("swiss-sans", "Swiss Sans"), ("editorial-serif", "Heritage Serif"), ("minimal-mono", "Artisan Mono")], id: \.0) { item in
                                let isSelected = fontStyle == item.0
                                Button(action: {
                                    fontStyle = item.0
                                    store.triggerHapticFeedback()
                                }) {
                                    Text(item.1)
                                        .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                                        .foregroundColor(isSelected ? .white : .primary)
                                        .padding(.vertical, 8)
                                        .frame(maxWidth: .infinity)
                                        .background(isSelected ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                        .cornerRadius(6)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                }
                
                // Live Vector Packaging Label View
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                        Text("LIVE VEKTOR-VORSCHAU")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                    }
                    
                    LiveLabelView(
                        producerName: producer.name,
                        customLabel: CustomLabelData(
                            headline: headline,
                            subtitle: "Custom Bespoke Creation",
                            dedication: dedication,
                            fontStyle: fontStyle,
                            batchNumber: "MZ-CH-\(Int.random(in: 100...999))",
                            dateString: DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .none)
                        ),
                        recipe: calculatedRecipe,
                        selections: selectedOptions,
                        weightText: product.unitText
                    )
                }
                .padding(.top, 8)
                
                // Add to Cart Button
                Button(action: handleAddToCart) {
                    HStack {
                        Image(systemName: "bag.badge.plus")
                        Text("In den Warenkorb — \(String(format: "%@ %.2f", producer.currency, calculatedPrice))")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.black)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
                }
                .padding(.top, 8)
                
            }
            .padding()
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Rezeptur-Canvas")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            setupInitialRatios()
        }
        .alert(isPresented: $showingAddedAlert) {
            Alert(
                title: Text("Zum Warenkorb hinzugefügt"),
                message: Text("Ihre individuelle Rezeptur wurde gesichert."),
                dismissButton: .default(Text("OK")) {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
    
    // MARK: - Logic
    private func setupInitialRatios() {
        guard let config = product.config, ratios.isEmpty else { return }
        let count = config.components.count
        var remaining = 100
        for (idx, comp) in config.components.enumerated() {
            if idx == count - 1 {
                ratios[comp.id] = Double(remaining)
            } else {
                let share = 100 / count
                ratios[comp.id] = Double(share)
                remaining -= share
            }
        }
        for opt in config.options {
            selectedOptions[opt.key] = opt.defaultValue
        }
    }
    
    private func resetEvenly(components: [BlendComponent]) {
        let count = components.count
        var remaining = 100
        for (idx, comp) in components.enumerated() {
            if idx == count - 1 {
                ratios[comp.id] = Double(remaining)
            } else {
                let share = 100 / count
                ratios[comp.id] = Double(share)
                remaining -= share
            }
        }
        store.triggerHapticFeedback()
    }
    
    private func updateRatio(for changedId: String, newValue: Double, allComponents: [BlendComponent]) {
        let target = max(0, min(100, round(newValue)))
        let old = ratios[changedId] ?? 0
        let diff = target - old
        if diff == 0 { return }
        
        let others = allComponents.filter { $0.id != changedId }
        let sumOthers = others.reduce(0.0) { $0 + (ratios[$1.id] ?? 0) }
        
        ratios[changedId] = target
        
        if sumOthers == 0 {
            let rem = 100.0 - target
            for (idx, o) in others.enumerated() {
                if idx == others.count - 1 {
                    ratios[o.id] = rem
                } else {
                    ratios[o.id] = floor(rem / Double(others.count))
                }
            }
        } else {
            for o in others {
                let current = ratios[o.id] ?? 0
                let share = current / sumOthers
                let updated = max(0, current - (diff * share))
                ratios[o.id] = round(updated)
            }
        }
        store.triggerHapticFeedback()
    }
    
    private var calculatedRecipe: [RecipeItem] {
        guard let config = product.config else { return [] }
        return config.components.compactMap { comp in
            let ratio = Int(ratios[comp.id] ?? 0)
            guard ratio > 0 else { return nil }
            let grams = Int(Double(ratio) / 100.0 * Double(config.totalWeightGrams))
            return RecipeItem(componentId: comp.id, componentName: comp.name, origin: comp.origin, ratio: ratio, grams: grams)
        }
    }
    
    private var calculatedPrice: Double {
        guard let config = product.config else { return product.basePrice }
        var factor = 0.0
        for comp in config.components {
            let share = (ratios[comp.id] ?? 0) / 100.0
            factor += share * comp.priceMultiplier
        }
        let price = product.basePrice * (factor > 0 ? factor : 1.0)
        return price
    }
    
    private func handleAddToCart() {
        let labelData = CustomLabelData(
            headline: headline,
            subtitle: "Custom Bespoke Creation",
            dedication: dedication,
            fontStyle: fontStyle,
            batchNumber: "MZ-CH-\(Int.random(in: 100...999))",
            dateString: DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .none)
        )
        
        let cartItem = CartItem(
            product: product,
            producer: producer,
            quantity: 1,
            unitPrice: calculatedPrice,
            recipe: calculatedRecipe,
            selections: selectedOptions,
            customLabel: labelData
        )
        
        store.addToCart(cartItem)
        showingAddedAlert = true
    }
}

// MARK: - Color Hex Extension
extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}
