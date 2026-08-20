import SwiftUI

struct BlendCustomizerView: View {
    @EnvironmentObject var store: AtelierStore
    @Environment(\.presentationMode) var presentationMode

    let product: Product
    let producer: Producer

    // Mode Selection: 0 = Standard Canvas / Direkt konfigurieren, 1 = Bespoke Quote Request / Eigenkreation anfragen
    @State private var customizerMode: Int = 0

    // MTO Canvas State
    @State private var ratios: [String: Double] = [:]
    @State private var selectedOptions: [String: String] = [:]
    @State private var customFieldValues: [String: String] = [:]
    @State private var selectedTasteTags: Set<String> = []
    @State private var headline: String = ""
    @State private var dedication: String = ""
    @State private var fontStyle: String = "swiss-sans"
    @State private var selectedTab: Int = 0 // 0: Recipe / Mix, 1: Details & Felder, 2: Etikett
    @State private var showingAddedAlert: Bool = false
    @State private var showingMaxComponentsAlert: Bool = false

    // Bespoke Quote Request State
    @State private var bespokeDescription: String = ""
    @State private var bespokeTasteSelection: Set<String> = []
    @State private var bespokeQuantity: Int = 1
    @State private var customerName: String = "Julian Steiner"
    @State private var customerEmail: String = "julian.steiner@bluewin.ch"
    @State private var customerCity: String = "Zürich"
    @State private var showingBespokeSentAlert: Bool = false

    private var config: CustomizationConfig? { product.config }
    private var supportsBespoke: Bool {
        config?.allowsBespokeQuoteRequest == true || product.transactionMode == .quoteRequest
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {

                // Top Header Summary
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(producer.name.uppercased())
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(Color(white: 0.5))
                            Text(product.title)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundColor(.primary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            if customizerMode == 0 && product.transactionMode != .quoteRequest {
                                Text("Endpreis inkl. MwSt.")
                                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                                    .foregroundColor(Color(white: 0.5))
                                Text(String(format: "%@ %.2f", producer.currency, calculatedPrice))
                                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                                    .foregroundColor(.primary)
                            } else {
                                Text("TRANSAKTION")
                                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                                    .foregroundColor(Color(white: 0.5))
                                Text("Offertanfrage")
                                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                                    .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                            }
                        }
                    }
                }
                .padding()
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)

                if product.shippingRestriction == .pickupOnly {
                    HStack(spacing: 6) {
                        Image(systemName: "figure.walk")
                        Text("Tagesfrisch · Nur zur Abholung im Atelier verfügbar")
                    }
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.secondary)
                }

                // Mode Picker (If product supports bespoke requests)
                if supportsBespoke && product.transactionMode != .quoteRequest {
                    Picker("Modus", selection: $customizerMode) {
                        Text("Direkt konfigurieren").tag(0)
                        Text("Eigenkreation anfragen").tag(1)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }

                if customizerMode == 1 || product.transactionMode == .quoteRequest {
                    bespokeQuoteSection
                } else {
                    standardCustomizerContent
                }

            }
            .padding()
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle(product.category.displayName)
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
        .alert(isPresented: $showingBespokeSentAlert) {
            Alert(
                title: Text("Offertanfrage gesendet"),
                message: Text("Der Hersteller hat Ihre Eigenkreation erhalten und wird Ihnen eine Offerte mit Preis & Feedback senden."),
                dismissButton: .default(Text("Zu den Anfragen")) {
                    store.selectedTab = 2 // Switch to Orders/Quotes tab
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
        .alert(isPresented: $showingMaxComponentsAlert) {
            Alert(
                title: Text("Maximale Sortenanzahl erreicht"),
                message: Text("Für dieses Produkt können maximal \(config?.maxSelectableComponents ?? 3) Sorten gleichzeitig gewählt werden, um ein harmonisches Geschmacksprofil zu gewährleisten. Bitte reduzieren Sie zuerst eine andere Sorte auf 0."),
                dismissButton: .default(Text("Verstanden"))
            )
        }
    }

    // MARK: - STANDARD CUSTOMIZER CONTENT
    private var standardCustomizerContent: some View {
        VStack(spacing: 20) {

            // Tabs for MTO Canvas
            Picker("Bereich", selection: $selectedTab) {
                Text("1. \(!(config?.sliderTitle ?? "").isEmpty ? "Mischung" : "Basis")").tag(0)
                if let config = config, (!config.options.isEmpty || !config.customFields.isEmpty) {
                    Text("2. Details & Felder").tag(1)
                }
                Text("3. Etikett").tag(2)
            }
            .pickerStyle(SegmentedPickerStyle())

            // TAB 0: Recipe / Flavor Mix / Build a Box Sliders
            if selectedTab == 0, let config = config {
                recipeSlidertab(config: config)
            }

            // TAB 1: Producer Custom Fields & Options
            if selectedTab == 1, let config = config {
                detailsAndFieldsTab(config: config)
            }

            // TAB 2: Custom Label
            if selectedTab == 2 {
                customLabelTab
            }

            // Allergen Declaration
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
                    Spacer()
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
                        subtitle: "\(product.category.displayName) · Handwerkliche Kreation",
                        dedication: dedication,
                        fontStyle: fontStyle,
                        batchNumber: "MZ-CH-\(Int.random(in: 100...999))",
                        dateString: DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .none)
                    ),
                    recipe: calculatedRecipe,
                    selections: selectedOptions,
                    customSpecs: formattedCustomSpecs,
                    tasteProfileTags: Array(selectedTasteTags),
                    weightText: product.unitText
                )
            }
            .padding(.top, 4)

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
            .padding(.top, 4)

            if !canAddToCart, let reason = blockedReason {
                Text(reason)
                    .font(.system(size: 11))
                    .foregroundColor(.orange)
            }
        }
    }

    // MARK: - TAB 0: Recipe & Flavor Sliders
    private func recipeSlidertab(config: CustomizationConfig) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(config.sliderTitle.uppercased())
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                    if let maxComp = config.maxSelectableComponents {
                        Text("Max. \(maxComp) Sorten aktiv wählbar (Aktiv: \(activeComponentCount)/\(maxComp))")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(activeComponentCount >= maxComp ? Color(red: 0.61, green: 0.29, blue: 0.18) : .secondary)
                    }
                }
                Spacer()
                if config.archetype != .buildABox && config.components.count > 0 {
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

    // MARK: - TAB 1: Details & Dynamic Fields
    private func detailsAndFieldsTab(config: CustomizationConfig) -> some View {
        VStack(alignment: .leading, spacing: 20) {

            // Dynamic Producer Custom Fields (Sliders, Steppers, Text, Taste Profiles)
            ForEach(config.customFields) { field in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(field.title.uppercased())
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                        if field.isRequired {
                            Text("*").foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                        }
                    }

                    if let sub = field.subtitle {
                        Text(sub)
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }

                    switch field.fieldType {
                    case .slider(let min, let max, let step, let unit, _, let labels):
                        VStack(alignment: .leading, spacing: 6) {
                            let currentVal = Double(customFieldValues[field.key] ?? "") ?? min
                            HStack {
                                Text(displaySliderLabel(value: currentVal, labels: labels, unit: unit))
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                                Spacer()
                            }

                            Slider(
                                value: Binding(
                                    get: { Double(customFieldValues[field.key] ?? "") ?? min },
                                    set: { newVal in
                                        customFieldValues[field.key] = String(format: step == 1 ? "%.0f" : "%.1f", newVal)
                                        store.triggerHapticFeedback()
                                    }
                                ),
                                in: min...max,
                                step: step
                            )
                            .accentColor(.black)
                        }
                        .padding(12)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(10)

                    case .stepper(let min, let max, let unit, _):
                        let count = Int(customFieldValues[field.key] ?? "") ?? min
                        HStack {
                            Text("\(count) \(unit)")
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                            Spacer()
                            Stepper("", value: Binding(
                                get: { Int(customFieldValues[field.key] ?? "") ?? min },
                                set: { newVal in
                                    customFieldValues[field.key] = "\(newVal)"
                                    store.triggerHapticFeedback()
                                }
                            ), in: min...max)
                            .labelsHidden()
                        }
                        .padding(12)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(10)

                    case .tasteProfile(let tags):
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(tags, id: \.self) { tag in
                                    let isSelected = selectedTasteTags.contains(tag)
                                    Button(action: {
                                        if isSelected {
                                            selectedTasteTags.remove(tag)
                                        } else {
                                            selectedTasteTags.insert(tag)
                                        }
                                        store.triggerHapticFeedback()
                                    }) {
                                        Text(tag)
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

                    case .text(let placeholder, let maxLen, _):
                        TextField(placeholder, text: Binding(
                            get: { customFieldValues[field.key] ?? "" },
                            set: { newVal in
                                customFieldValues[field.key] = String(newVal.prefix(maxLen))
                            }
                        ))
                        .textFieldStyle(RoundedBorderTextFieldStyle())

                    case .singleChoice(let options):
                        ForEach(options) { choice in
                            let isSelected = customFieldValues[field.key] == choice.value
                            Button(action: {
                                customFieldValues[field.key] = choice.value
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

                    case .multipleChoice(let options, _):
                        ForEach(options) { choice in
                            let currentSelections = Set((customFieldValues[field.key] ?? "").components(separatedBy: ",").filter { !$0.isEmpty })
                            let isSelected = currentSelections.contains(choice.value)
                            Button(action: {
                                var updated = currentSelections
                                if isSelected { updated.remove(choice.value) } else { updated.insert(choice.value) }
                                customFieldValues[field.key] = updated.joined(separator: ",")
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

            // Standard Options (Grind, Packaging, Bases, etc.)
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

    // MARK: - TAB 2: Custom Label
    private var customLabelTab: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("ETIKETTEN-PERSONALISIERUNG")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 4) {
                Text("Titel der Kreation")
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
                    TextField("z.B. Frisch gefertigt für Zürich", text: $dedication)
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

    // MARK: - BESPOKE QUOTE REQUEST SECTION
    private var bespokeQuoteSection: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                    Text("INDIVIDUELLE EIGENKREATION ANFRAGEN")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                }
                Text("Schlagen Sie dem Hersteller Ihre persönliche Geschmacksidee vor. Die Manufaktur prüft die Machbarkeit und sendet Ihnen eine unverbindliche Offerte mit Preisvorschlag.")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            // Taste Profile Tags
            let availableTags = config?.bespokeTasteTags ?? ["fruchtig", "süss", "nussig", "cremig", "sauer", "schokoladig", "würzig", "vegan"]
            VStack(alignment: .leading, spacing: 8) {
                Text("GESCHMACKSRICHTUNG & PROFIL")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(availableTags, id: \.self) { tag in
                            let isSelected = bespokeTasteSelection.contains(tag)
                            Button(action: {
                                if isSelected {
                                    bespokeTasteSelection.remove(tag)
                                } else {
                                    bespokeTasteSelection.insert(tag)
                                }
                                store.triggerHapticFeedback()
                            }) {
                                Text(tag)
                                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                    .foregroundColor(isSelected ? .white : .primary)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(isSelected ? Color.black : Color(UIColor.secondarySystemGroupedBackground))
                                    .cornerRadius(8)
                            }
                        }
                    }
                }
            }

            // Description / Recipe Wish
            VStack(alignment: .leading, spacing: 6) {
                Text("BESCHREIBUNG DER WUNSCHKREATION *")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)

                TextEditor(text: $bespokeDescription)
                    .frame(minHeight: 110)
                    .padding(8)
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(UIColor.separator), lineWidth: 1)
                    )

                if bespokeDescription.isEmpty {
                    Text(config?.bespokePlaceholder ?? "z.B. Maracuja-Himbeer Sorbet mit geröstetem Bergthymian & rosa Pfeffer, eher fruchtig-säuerlich...")
                        .font(.system(size: 11))
                        .foregroundColor(Color(white: 0.6))
                        .italic()
                }
            }

            // Quantity Stepper
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("GEWÜNSCHTE MENGE")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                    Text("\(bespokeQuantity)x \(product.unitText)")
                        .font(.system(size: 14, weight: .semibold))
                }
                Spacer()
                Stepper("", value: $bespokeQuantity, in: 1...20)
                    .labelsHidden()
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            // Contact Info
            VStack(alignment: .leading, spacing: 10) {
                Text("IHRE KONTAKTDATEN")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)

                TextField("Name", text: $customerName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                TextField("E-Mail", text: $customerEmail)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.emailAddress)
                TextField("Wohnort / Abholort", text: $customerCity)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            // Submit Bespoke Quote Request Button
            Button(action: handleSendBespokeQuote) {
                HStack {
                    Image(systemName: "paperplane.fill")
                    Text("Eigenkreation unverbindlich anfragen")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(canSendBespoke ? Color(red: 0.61, green: 0.29, blue: 0.18) : Color.gray)
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
            }
            .disabled(!canSendBespoke)

            if !canSendBespoke {
                Text("Bitte beschreiben Sie Ihre Wunschkreation und geben Sie Ihre Kontaktdaten an.")
                    .font(.system(size: 11))
                    .foregroundColor(.orange)
            }
        }
    }

    // MARK: - Logic & Actions
    private func setupInitialState() {
        guard let config = config, ratios.isEmpty else { return }
        headline = config.labelConfig.headlinePlaceholder.isEmpty ? "Signature Blend" : config.labelConfig.headlinePlaceholder

        for comp in config.components { ratios[comp.id] = 0 }

        if config.archetype != .buildABox && config.archetype != .flavorMix {
            // Evenly distribute across max allowed components
            let available = config.components.filter { !$0.isOutOfStock }
            let maxCount = min(available.count, config.maxSelectableComponents ?? available.count)
            let chosen = Array(available.prefix(maxCount))

            if !chosen.isEmpty {
                var remaining = config.targetTotal
                for (idx, comp) in chosen.enumerated() {
                    if idx == chosen.count - 1 {
                        ratios[comp.id] = remaining
                    } else {
                        let share = (config.targetTotal / Double(chosen.count)).rounded(.down)
                        ratios[comp.id] = share
                        remaining -= share
                    }
                }
            }
        } else if config.archetype == .flavorMix {
            // Initial flavor mix (e.g. 50/50 for top 2 flavors)
            let available = config.components.filter { !$0.isOutOfStock }
            if available.count >= 2 {
                ratios[available[0].id] = 50
                ratios[available[1].id] = 50
            } else if let first = available.first {
                ratios[first.id] = 100
            }
        }

        for opt in config.options {
            selectedOptions[opt.key] = opt.defaultValue
        }

        for field in config.customFields {
            switch field.fieldType {
            case .slider(_, _, let step, _, let defaultValue, _):
                customFieldValues[field.key] = String(format: step == 1 ? "%.0f" : "%.1f", defaultValue)
            case .stepper(_, _, _, let defaultValue):
                customFieldValues[field.key] = "\(defaultValue)"
            case .singleChoice(let options):
                customFieldValues[field.key] = options.first?.value ?? ""
            case .tasteProfile(let tags):
                if let first = tags.first { selectedTasteTags.insert(first) }
            default:
                break
            }
        }
    }

    private var activeComponentCount: Int {
        guard let config = config else { return 0 }
        return config.components.filter { (ratios[$0.id] ?? 0) > 0 }.count
    }

    private func resetEvenly(config: CustomizationConfig) {
        let available = config.components.filter { !$0.isOutOfStock }
        let maxCount = min(available.count, config.maxSelectableComponents ?? available.count)
        let chosen = Array(available.prefix(maxCount))
        guard !chosen.isEmpty else { return }

        for comp in config.components { ratios[comp.id] = 0 }
        var remaining = config.targetTotal
        for (idx, comp) in chosen.enumerated() {
            if idx == chosen.count - 1 {
                ratios[comp.id] = remaining
            } else {
                let share = (config.targetTotal / Double(chosen.count)).rounded(.down)
                ratios[comp.id] = share
                remaining -= share
            }
        }
        store.triggerHapticFeedback()
    }

    private var totalSelected: Double {
        guard let config = config else { return 0 }
        return config.components.reduce(0) { $0 + (ratios[$1.id] ?? 0) }
    }

    private func updateRatio(for changedId: String, newValue: Double, config: CustomizationConfig) {
        guard let changedComp = config.components.first(where: { $0.id == changedId }), !changedComp.isOutOfStock else { return }
        let currentOld = ratios[changedId] ?? 0

        // Max components check: if activating from 0 and limit reached
        if currentOld == 0 && newValue > 0 {
            if let maxLimit = config.maxSelectableComponents, activeComponentCount >= maxLimit {
                showingMaxComponentsAlert = true
                return
            }
        }

        let perComponentMax = min(config.targetTotal, changedComp.maxRatio)
        let target = max(0, min(perComponentMax, round(newValue)))
        let diff = target - currentOld
        if diff == 0 { return }

        if config.archetype == .buildABox {
            let others = config.components.filter { $0.id != changedId }
            let sumOthers = others.reduce(0.0) { $0 + (ratios[$1.id] ?? 0) }
            ratios[changedId] = max(0, min(target, config.targetTotal - sumOthers))
            store.triggerHapticFeedback()
            return
        }

        if config.archetype == .flavorMix {
            // Free flavor mix: set directly, capping total to 100%
            let others = config.components.filter { $0.id != changedId }
            let sumOthers = others.reduce(0.0) { $0 + (ratios[$1.id] ?? 0) }
            ratios[changedId] = max(0, min(target, config.targetTotal - sumOthers))
            store.triggerHapticFeedback()
            return
        }

        // 100%-lock redistribution
        let others = config.components.filter { $0.id != changedId && !$0.isOutOfStock && (ratios[$0.id] ?? 0) > 0 }
        let sumOthers = others.reduce(0.0) { $0 + (ratios[$1.id] ?? 0) }

        ratios[changedId] = target
        for comp in config.components where comp.id != changedId && comp.isOutOfStock {
            ratios[comp.id] = 0
        }

        if sumOthers == 0 {
            let availableOthers = config.components.filter { $0.id != changedId && !$0.isOutOfStock }
            let rem = config.targetTotal - target
            for (idx, o) in availableOthers.prefix(1).enumerated() {
                ratios[o.id] = max(0, rem)
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

        for field in config.customFields {
            if case .singleChoice(let choices) = field.fieldType {
                if let val = customFieldValues[field.key], let choice = choices.first(where: { $0.value == val }) {
                    price += choice.priceDelta ?? 0
                }
            }
        }

        return price
    }

    private var formattedCustomSpecs: [String: String] {
        var dict: [String: String] = [:]
        guard let config = config else { return dict }
        for field in config.customFields {
            guard let val = customFieldValues[field.key], !val.isEmpty else { continue }
            if case .slider(_, _, _, let unit, _, let labels) = field.fieldType {
                let num = Double(val) ?? 0
                dict[field.title] = displaySliderLabel(value: num, labels: labels, unit: unit)
            } else {
                dict[field.title] = val
            }
        }
        return dict
    }

    private func displaySliderLabel(value: Double, labels: [SliderLabel]?, unit: String) -> String {
        if let labels = labels, let match = labels.first(where: { abs($0.value - value) < 0.1 }) {
            return match.label
        }
        return "\(Int(value))\(unit)"
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

    private var canSendBespoke: Bool {
        !bespokeDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !customerName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !customerEmail.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func handleAddToCart() {
        guard canAddToCart else { return }
        let labelData = CustomLabelData(
            headline: headline,
            subtitle: "\(product.category.displayName) · Made to Order",
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
            customFieldValues: customFieldValues,
            selectedTasteTags: Array(selectedTasteTags),
            bespokeDescription: nil,
            customLabel: labelData
        )

        store.addToCart(cartItem)
        showingAddedAlert = true
    }

    private func handleSendBespokeQuote() {
        guard canSendBespoke else { return }

        let customer = CustomerDetails(
            name: customerName,
            email: customerEmail,
            street: "",
            postalCode: "",
            city: customerCity,
            country: producer.country
        )

        let items = [
            QuoteItem(
                productTitle: "\(product.title) (Eigenkreation)",
                quantity: bespokeQuantity
            )
        ]

        store.createQuoteRequest(
            items: items,
            customer: customer,
            producer: producer,
            customerNote: bespokeDescription,
            selectedTasteTags: Array(bespokeTasteSelection),
            bespokeDescription: bespokeDescription,
            customFieldValues: customFieldValues
        )

        showingBespokeSentAlert = true
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
