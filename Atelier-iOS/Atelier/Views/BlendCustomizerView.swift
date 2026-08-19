import SwiftUI

struct BlendCustomizerView: View {
    @EnvironmentObject var store: AtelierStore
    @Environment(\.presentationMode) var presentationMode

    let product: Product
    let producer: Producer

    @State private var ratios: [String: Double] = [:]
    @State private var selectedOptions: [String: String] = [:]
    @State private var headline: String = ""
    @State private var dedication: String = ""
    @State private var fontStyle: String = "swiss-sans"
    @State private var selectedTab: Int = 0 // 0: Recipe, 1: Options, 2: Label
    @State private var showingAddedAlert: Bool = false

    private var config: CustomizationConfig? { product.config }

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

                if product.shippingRestriction == .pickupOnly {
                    Label("Nur zur Abholung im Atelier verfügbar", systemImage: "figure.walk")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.secondary)
                }

                // Segmented Picker
                Picker("Bereich", selection: $selectedTab) {
                    Text("1. \(!(config?.sliderTitle ?? "").isEmpty ? "Rezeptur" : "Auswahl")").tag(0)
                    if let config = config, !config.options.isEmpty {
                        Text("2. Optionen").tag(1)
                    }
                    Text("3. Etikett").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())

                // TAB 0: Recipe / Build-a-Box Sliders
                if selectedTab == 0, let config = config {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Text(config.archetype == .buildABox ? "FREIE AUSWAHL" : "PROZENTUALE MISCHUNG")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                            Spacer()
                            if config.archetype != .buildABox {
                                Button("Gleichmässig") {
                                    resetEvenly(config: config)
                                }
                                .font(.system(size: 11, weight: .semibold))
                            }
                        }

                        if config.archetype == .buildABox {
                            Text("Verbleibend: \(Int(max(0, config.targetTotal - totalSelected)))\(config.targetUnit)")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundColor(.secondary)
                        }

                        // Multi-Bar Preview
                        GeometryReader { geo in
                            HStack(spacing: 1) {
                                ForEach(config.components) { comp in
                                    let ratio = ratios[comp.id] ?? 0
                                    if ratio > 0 {
                                        Rectangle()
                                            .fill(Color(hex: comp.hexColor))
                                            .frame(width: geo.size.width * CGFloat(ratio / max(config.targetTotal, 1)))
                                    }
                                }
                            }
                        }
                        .frame(height: 10)
                        .cornerRadius(5)

                        // Component Sliders
                        ForEach(config.components) { comp in
                            let ratio = Int(ratios[comp.id] ?? 0)
                            let grams = config.archetype == .buildABox
                                ? ratio
                                : Int(Double(ratio) / max(config.targetTotal, 1) * Double(config.totalWeightGrams))

                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Circle()
                                        .fill(Color(hex: comp.hexColor))
                                        .frame(width: 8, height: 8)
                                    Text(comp.name)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(comp.isOutOfStock ? .secondary : .primary)
                                    if comp.isOutOfStock {
                                        Text("AUSVERKAUFT")
                                            .font(.system(size: 8, weight: .bold, design: .monospaced))
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 5).padding(.vertical, 2)
                                            .background(Color.red)
                                            .cornerRadius(3)
                                    }
                                    Spacer()
                                    Text(config.archetype == .buildABox ? "\(ratio)\(config.targetUnit)" : "\(ratio)% (\(grams)g)")
                                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                                }

                                if !comp.origin.isEmpty || !comp.process.isEmpty {
                                    Text("\(comp.origin) · \(comp.process)")
                                        .font(.system(size: 10))
                                        .foregroundColor(.secondary)
                                }

                                Slider(
                                    value: Binding(
                                        get: { comp.isOutOfStock ? 0 : (ratios[comp.id] ?? 0) },
                                        set: { newVal in
                                            updateRatio(for: comp.id, newValue: newVal, config: config)
                                        }
                                    ),
                                    in: 0...max(comp.maxRatio, 1),
                                    step: config.archetype == .buildABox ? 1 : 5
                                )
                                .accentColor(.black)
                                .disabled(comp.isOutOfStock)
                            }
                            .padding(12)
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(10)
                            .opacity(comp.isOutOfStock ? 0.5 : 1.0)
                        }
                    }
                }

                // TAB 1: Options
                if selectedTab == 1, let config = config {
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(config.options) { opt in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(opt.title.uppercased())
                                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                                        .foregroundColor(.secondary)
                                    if opt.isRequired {
                                        Text("*").foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                                    }
                                }

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
                                            if let delta = choice.priceDelta, delta > 0 {
                                                Text("+\(producer.currency) \(String(format: "%.2f", delta))")
                                                    .font(.system(size: 10, design: .monospaced))
                                                    .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                                            }
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
                            TextField(config?.labelConfig.headlinePlaceholder ?? "z.B. Julians Morning Fuel", text: $headline)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }

                        if config?.labelConfig.allowDedication == true {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Widmung / Notiz (Optional)")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.secondary)
                                TextField("z.B. Frisch geröstet für Zürich", text: $dedication)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                            }
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

                // Allergen Declaration (LMIV / LIV Pflichtangabe)
                if !activeAllergens.isEmpty {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Allergenkennzeichnung")
                                .font(.system(size: 11, weight: .bold))
                            Text("Enthält: \(activeAllergens.map { $0.label }.joined(separator: ", "))")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
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
                    .background(canAddToCart ? Color.black : Color.gray)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
                }
                .disabled(!canAddToCart)
                .padding(.top, 8)

                if !canAddToCart, let reason = blockedReason {
                    Text(reason)
                        .font(.system(size: 11))
                        .foregroundColor(.orange)
                }

            }
            .padding()
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Rezeptur-Canvas")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            setupInitialState()
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
    private func setupInitialState() {
        guard let config = config, ratios.isEmpty else { return }
        headline = config.labelConfig.headlinePlaceholder.isEmpty ? "Mein Signature Blend" : config.labelConfig.headlinePlaceholder

        for comp in config.components { ratios[comp.id] = 0 }

        if config.archetype != .buildABox {
            // Evenly distribute the 100%-locked recipe across in-stock components only.
            let available = config.components.filter { !$0.isOutOfStock }
            let count = available.count
            if count > 0 {
                var remaining = config.targetTotal
                for (idx, comp) in available.enumerated() {
                    if idx == count - 1 {
                        ratios[comp.id] = remaining
                    } else {
                        let share = (config.targetTotal / Double(count)).rounded(.down)
                        ratios[comp.id] = share
                        remaining -= share
                    }
                }
            }
        }

        for opt in config.options {
            selectedOptions[opt.key] = opt.defaultValue
        }
    }

    private func resetEvenly(config: CustomizationConfig) {
        let available = config.components.filter { !$0.isOutOfStock }
        let count = available.count
        guard count > 0 else { return }
        var remaining = config.targetTotal
        for (idx, comp) in available.enumerated() {
            if idx == count - 1 {
                ratios[comp.id] = remaining
            } else {
                let share = (config.targetTotal / Double(count)).rounded(.down)
                ratios[comp.id] = share
                remaining -= share
            }
        }
        for comp in config.components where comp.isOutOfStock {
            ratios[comp.id] = 0
        }
        store.triggerHapticFeedback()
    }

    private var totalSelected: Double {
        guard let config = config else { return 0 }
        return config.components.reduce(0) { $0 + (ratios[$1.id] ?? 0) }
    }

    private func updateRatio(for changedId: String, newValue: Double, config: CustomizationConfig) {
        guard let changedComp = config.components.first(where: { $0.id == changedId }), !changedComp.isOutOfStock else { return }
        let perComponentMax = min(config.targetTotal, changedComp.maxRatio)
        let target = max(0, min(perComponentMax, round(newValue)))
        let old = ratios[changedId] ?? 0
        let diff = target - old
        if diff == 0 { return }

        if config.archetype == .buildABox {
            // Build-a-box has an inclusive total (e.g. "3 Kugeln") — the sum
            // across all components may never exceed it.
            let others = config.components.filter { $0.id != changedId }
            let sumOthers = others.reduce(0.0) { $0 + (ratios[$1.id] ?? 0) }
            ratios[changedId] = max(0, min(target, config.targetTotal - sumOthers))
            store.triggerHapticFeedback()
            return
        }

        // 100%-lock redistribution: out-of-stock components never receive a
        // share — they stay at 0.
        let others = config.components.filter { $0.id != changedId && !$0.isOutOfStock }
        let sumOthers = others.reduce(0.0) { $0 + (ratios[$1.id] ?? 0) }

        ratios[changedId] = target
        for comp in config.components where comp.id != changedId && comp.isOutOfStock {
            ratios[comp.id] = 0
        }

        if sumOthers == 0 {
            let rem = config.targetTotal - target
            for (idx, o) in others.enumerated() {
                if idx == others.count - 1 {
                    ratios[o.id] = max(0, rem)
                } else {
                    ratios[o.id] = max(0, floor(rem / Double(others.count)))
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
        guard let config = config else { return [] }
        return config.components.compactMap { comp in
            let ratio = Int(ratios[comp.id] ?? 0)
            guard ratio > 0 else { return nil }
            let grams = config.archetype == .buildABox
                ? ratio
                : Int(Double(ratio) / max(config.targetTotal, 1) * Double(config.totalWeightGrams))
            return RecipeItem(componentId: comp.id, componentName: comp.name, origin: comp.origin, ratio: ratio, grams: grams)
        }
    }

    private var calculatedPrice: Double {
        guard let config = config else { return product.basePrice }
        var factor = 0.0
        for comp in config.components {
            let share = (ratios[comp.id] ?? 0) / max(config.targetTotal, 1)
            factor += share * comp.priceMultiplier
        }
        var price = product.basePrice * (factor > 0 ? factor : 1.0)

        for opt in config.options {
            guard let val = selectedOptions[opt.key], let choice = opt.values.first(where: { $0.value == val }) else { continue }
            price += choice.priceDelta ?? 0
        }
        return price
    }

    private var activeAllergens: [AllergenCode] {
        guard let config = config else { return product.allergens }
        var set = Set<AllergenCode>(product.allergens)
        for comp in config.components where (ratios[comp.id] ?? 0) > 0 {
            set.formUnion(comp.allergens)
        }
        for opt in config.options {
            guard let val = selectedOptions[opt.key], let choice = opt.values.first(where: { $0.value == val }) else { continue }
            set.formUnion(choice.allergens)
        }
        return Array(set)
    }

    private var missingRequiredOption: CustomizationOption? {
        config?.options.first { opt in
            opt.isRequired && (selectedOptions[opt.key]?.isEmpty ?? true)
        }
    }

    private var canAddToCart: Bool {
        guard !headline.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
        return missingRequiredOption == nil
    }

    private var blockedReason: String? {
        if headline.trimmingCharacters(in: .whitespaces).isEmpty {
            return "Bitte einen Titel für das Etikett vergeben."
        }
        if let opt = missingRequiredOption {
            return "Bitte Pflichtfeld ausfüllen: \(opt.title)"
        }
        return nil
    }

    private func handleAddToCart() {
        guard canAddToCart else { return }
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
