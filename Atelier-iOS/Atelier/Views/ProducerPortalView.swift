import SwiftUI

struct ProducerPortalView: View {
    @EnvironmentObject var store: AtelierStore
    @State private var portalSection: Int = 0 // 0: KDS, 1: MTO Canvas, 2: Standards, 3: Anfragen, 4: Einstellungen
    @State private var showingNewBusinessSheet: Bool = false

    // New Business Form State
    @State private var newBizName: String = ""
    @State private var newBizTagline: String = ""
    @State private var newBizCity: String = "Zürich"
    @State private var newBizCategory: CraftCategory = .coffee
    @State private var newBizCountry: DACHCountry = .ch
    @State private var newBizVat: String = "CHE-123.456.789 MWST"
    @State private var newBizLeadTime: String = "Röstung dienstags, Versand mittwochs"
    @State private var newBizPin: String = ""

    private var myProducers: [Producer] {
        store.producers.filter { store.myProducerIds.contains($0.id) }
    }

    var body: some View {
        NavigationView {
            Group {
                if let producer = store.selectedProducer, !store.myProducerIds.contains(producer.id) {
                    // Selected producer isn't owned by this user at all — snap
                    // back rather than exposing a workspace that isn't theirs.
                    Color.clear.onAppear {
                        store.selectedProducer = myProducers.first
                    }
                } else if let producer = store.selectedProducer, !store.isPortalUnlocked(producer.id) {
                    PortalLockScreenView(producer: producer, myProducers: myProducers)
                } else {
                    portalContent
                }
            }
            .navigationTitle("Werkstatt-Portal")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingNewBusinessSheet) {
                newBusinessSheet
            }
        }
    }

    // MARK: - Unlocked Portal Content
    private var portalContent: some View {
        ScrollView {
            VStack(spacing: 20) {

                if let producer = store.selectedProducer {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Circle().fill(Color.green).frame(width: 8, height: 8)
                            Text("PRODUZENTEN-WORKSPACE · GESCHÜTZT")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                            Spacer()
                            Button(action: { showingNewBusinessSheet = true }) {
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

                        let capacity = store.getBatchCapacityInfo(producerId: producer.id)
                        HStack(spacing: 14) {
                            statChip(label: "OFFENE AUFTRÄGE", value: "\(store.orders.filter { $0.producerId == producer.id && $0.status != .completed }.count)")
                            statChip(label: "CHARGE", value: capacity.capacity != nil ? "\(capacity.booked)/\(capacity.capacity!)\(capacity.isFull ? " · VOLL" : "")" : "unbegrenzt")
                            statChip(label: "ANFRAGEN", value: "\(store.quotes.filter { $0.producerId == producer.id && ($0.status == .requested || $0.status == .quoted || $0.status == .accepted) }.count)")
                        }

                        // Multi-business picker — only businesses this user owns.
                        if myProducers.count > 1 {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(myProducers) { p in
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
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(14)
                    .padding(.horizontal)
                }

                Picker("Bereich", selection: $portalSection) {
                    Text("KDS").tag(0)
                    Text("MTO").tag(1)
                    Text("Standards").tag(2)
                    Text("Anfragen").tag(3)
                    Text("Settings").tag(4)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)

                if portalSection == 0 { kdsSection }
                if portalSection == 1 { mtoSection }
                if portalSection == 2 { standardsSection }
                if portalSection == 3 { quotesSection }
                if portalSection == 4 { settingsSection }

            }
            .padding(.vertical)
        }
        .background(Color(UIColor.systemGroupedBackground))
    }

    private func statChip(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.system(size: 8, weight: .bold, design: .monospaced)).foregroundColor(.secondary)
            Text(value).font(.system(size: 13, weight: .bold, design: .monospaced))
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Color(UIColor.tertiarySystemGroupedBackground))
        .cornerRadius(8)
    }

    // MARK: - SECTION 0: KDS Production Queue
    private var kdsSection: some View {
        let producerOrders = store.orders.filter { $0.producerId == store.selectedProducer?.id }
        return Group {
            if producerOrders.isEmpty {
                Text("Keine aktiven Aufträge in der KDS-Queue.")
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundColor(.secondary)
                    .padding(.top, 40)
            } else {
                ForEach(producerOrders) { order in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("#\(order.orderNumber) · \(order.customer.name)")
                                    .font(.system(size: 14, weight: .bold))
                                Text("\(order.customer.city.isEmpty ? "Abholung" : order.customer.city) · \(order.fulfillmentType == .pickup ? "Abholung" : "Post")")
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Text(order.status.title(for: order.fulfillmentType))
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
                                            Text(r.componentName).font(.system(size: 11))
                                            Spacer()
                                            Text("\(r.ratio)% (\(r.grams)g)").font(.system(size: 11, weight: .bold, design: .monospaced))
                                        }
                                    }
                                    if !item.aggregatedAllergens.isEmpty {
                                        Text("Allergene: \(item.aggregatedAllergens.map { $0.label }.joined(separator: ", "))")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundColor(.orange)
                                    }
                                }
                                .padding(8)
                                .background(Color(UIColor.tertiarySystemGroupedBackground))
                                .cornerRadius(6)
                            }
                        }

                        HStack {
                            if let prev = order.status.previous(for: order.fulfillmentType) {
                                Button(action: {
                                    store.updateOrderStatus(orderId: order.id, newStatus: prev)
                                }) {
                                    Image(systemName: "arrow.left")
                                        .padding(8)
                                        .background(Color(UIColor.tertiarySystemGroupedBackground))
                                        .cornerRadius(8)
                                }
                            }

                            Spacer()

                            if let next = order.status.next(for: order.fulfillmentType) {
                                Button(action: {
                                    store.updateOrderStatus(orderId: order.id, newStatus: next)
                                }) {
                                    HStack(spacing: 4) {
                                        Text(nextActionLabel(current: order.status, fulfillment: order.fulfillmentType))
                                        Image(systemName: "arrow.right")
                                    }
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 14).padding(.vertical, 8)
                                    .background(Color.black)
                                    .cornerRadius(8)
                                }
                            } else {
                                Label("Erledigt", systemImage: "checkmark.circle.fill")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.green)
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
    }

    private func nextActionLabel(current: OrderStatus, fulfillment: FulfillmentType) -> String {
        if current == .readyForHandover || current == .shipped {
            return fulfillment == .pickup ? "Als abgeholt bestätigen" : "Als zugestellt bestätigen"
        }
        return "Weiter"
    }

    // MARK: - SECTION 1: Made-to-Order Custom Products
    private var mtoSection: some View {
        let mtoProducts = store.products.filter { $0.producerId == store.selectedProducer?.id && $0.isCustomizable }
        return VStack(alignment: .leading, spacing: 12) {
            Text("MADE-TO-ORDER PRODUKTE MIT SCHIEBER-CANVAS")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(.secondary)
                .padding(.horizontal)

            ForEach(mtoProducts, id: \.id) { (prod: Product) in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(prod.title).font(.system(size: 15, weight: .bold))
                        Spacer()
                        Text(String(format: "CHF %.2f", prod.basePrice)).font(.system(size: 14, weight: .bold, design: .monospaced))
                    }

                    if let cfg = prod.config {
                        HStack {
                            Text(cfg.archetype.displayName.uppercased())
                                .font(.system(size: 9, weight: .bold, design: .monospaced))
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color.black.opacity(0.08))
                                .cornerRadius(4)

                            if let maxComp = cfg.maxSelectableComponents {
                                Text("Max. \(maxComp) Sorten wählbar")
                                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                    .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                            }
                            Spacer()
                        }

                        Text("\(cfg.sliderTitle) · \(cfg.components.count) Komponenten")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.secondary)

                        ForEach(cfg.components) { comp in
                            HStack {
                                Circle().fill(Color(hex: comp.hexColor)).frame(width: 6, height: 6)
                                Text(comp.name).font(.system(size: 11))
                                    .foregroundColor(comp.isOutOfStock ? .secondary : .primary)
                                if comp.isOutOfStock {
                                    Text("AUSVERKAUFT").font(.system(size: 7, weight: .bold)).foregroundColor(.red)
                                }
                                Spacer()
                                if let stock = comp.stockQuantity {
                                    Text("\(stock) auf Lager").font(.system(size: 9, design: .monospaced)).foregroundColor(.secondary)
                                }
                                Toggle("", isOn: Binding(
                                    get: { comp.inStock },
                                    set: { newVal in
                                        store.saveProduct(withUpdatedComponent(prod, componentId: comp.id) { $0.inStock = newVal })
                                    }
                                ))
                                .labelsHidden()
                                .scaleEffect(0.7)
                            }
                        }

                        // Configured Custom Fields Display
                        if !cfg.customFields.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("HERSTELLER-EIGENE FELDER:")
                                    .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                                    .foregroundColor(.secondary)
                                    .padding(.top, 4)

                                ForEach(cfg.customFields) { field in
                                    HStack {
                                        Image(systemName: fieldIcon(for: field.fieldType))
                                            .font(.system(size: 9))
                                            .foregroundColor(.secondary)
                                        Text(field.title)
                                            .font(.system(size: 10, weight: .medium))
                                        Spacer()
                                        Text(fieldSummary(for: field.fieldType))
                                            .font(.system(size: 9, design: .monospaced))
                                            .foregroundColor(.secondary)
                                    }
                                    .padding(.vertical, 2)
                                }
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

    private func fieldIcon(for type: CustomFieldType) -> String {
        switch type {
        case .slider: return "slider.horizontal.3"
        case .stepper: return "plusminus"
        case .tasteProfile: return "tag.fill"
        case .text: return "text.cursor"
        case .singleChoice: return "list.bullet"
        case .multipleChoice: return "checklist"
        }
    }

    private func fieldSummary(for type: CustomFieldType) -> String {
        switch type {
        case .slider(let min, let max, _, let unit, _, _):
            return "\(Int(min))–\(Int(max))\(unit) Slider"
        case .stepper(let min, let max, let unit, _):
            return "\(min)–\(max) \(unit) Stepper"
        case .tasteProfile(let tags):
            return "\(tags.count) Geschmackstags"
        case .text(_, let maxLen, _):
            return "Textfeld (max. \(maxLen))"
        case .singleChoice(let opt):
            return "\(opt.count) Optionen"
        case .multipleChoice(let opt, _):
            return "\(opt.count) Mehrfachauswahl"
        }
    }

    private func withUpdatedComponent(_ product: Product, componentId: String, _ mutate: (inout BlendComponent) -> Void) -> Product {
        var updated = product
        guard var config = updated.config,
              let idx = config.components.firstIndex(where: { $0.id == componentId }) else { return product }
        mutate(&config.components[idx])
        updated.config = config
        return updated
    }

    // MARK: - SECTION 2: Standard Sortiment Products
    private var standardsSection: some View {
        let standardProducts = store.products.filter { $0.producerId == store.selectedProducer?.id && !$0.isCustomizable }
        return VStack(alignment: .leading, spacing: 12) {
            Text("STANDARDSORTIMENT DER MANUFAKTUR")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(.secondary)
                .padding(.horizontal)

            ForEach(standardProducts) { prod in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(prod.title).font(.system(size: 14, weight: .bold))
                        Text(prod.transactionMode == .quoteRequest
                             ? "Nur auf Anfrage · \(prod.unitText)"
                             : "Lagerbestand: \(prod.stockQuantity ?? 0) Stk. · \(prod.unitText)")
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

    // MARK: - SECTION 3: Quote / Offerte -> Rechnung Management
    private var quotesSection: some View {
        let producerQuotes = store.quotes.filter { $0.producerId == store.selectedProducer?.id }
        return VStack(alignment: .leading, spacing: 12) {
            Text("EINGEHENDE EIGENKREATION- & OFFERTANFRAGEN")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(.secondary)
                .padding(.horizontal)

            Text("Prüfen Sie Kundenwünsche, vergeben Sie einen individuellen Preis mit Begleitnachricht oder lehnen Sie die Anfrage ab.")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
                .padding(.horizontal)

            if producerQuotes.isEmpty {
                Text("Noch keine Anfragen eingegangen.")
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundColor(.secondary)
                    .padding(.top, 20)
            } else {
                ForEach(producerQuotes) { quote in
                    QuoteRow(quote: quote, invoice: store.invoices.first { $0.quoteId == quote.id })
                        .padding(.horizontal)
                }
            }
        }
    }

    // MARK: - SECTION 4: Settings (Portal PIN, Batch Capacity)
    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let producer = store.selectedProducer {
                VStack(alignment: .leading, spacing: 10) {
                    Text("PORTAL-ZUGRIFFSCODE")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                    Text("Wird beim Wechsel in dieses Portal abgefragt — einfacher Zugriffsschutz, kein vollständiges Login-System.")
                        .font(.system(size: 10)).foregroundColor(.secondary)
                    TextField("PIN", text: Binding(
                        get: { producer.portalPin },
                        set: { newVal in
                            let digits = String(newVal.filter { $0.isNumber }.prefix(6))
                            store.updateProducer(producer.id) { $0.portalPin = digits }
                        }
                    ))
                    .keyboardType(.numberPad)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(width: 120)
                }
                .padding()
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 10) {
                    Text("KAPAZITÄTSGRENZE PRO FERTIGUNGSCHARGE")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                    Text("Verhindert Überbuchung: sobald erreicht, sehen Kunden im Checkout einen Hinweis.")
                        .font(.system(size: 10)).foregroundColor(.secondary)
                    TextField("unbegrenzt", text: Binding(
                        get: { producer.capacityPerBatch.map { String($0) } ?? "" },
                        set: { newVal in
                            let digits = newVal.filter { $0.isNumber }
                            store.updateProducer(producer.id) { $0.capacityPerBatch = digits.isEmpty ? nil : Int(digits) }
                        }
                    ))
                    .keyboardType(.numberPad)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(width: 120)
                }
                .padding()
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - New Business Sheet
    private var newBusinessSheet: some View {
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

                Section(header: Text("Portal-Zugriffscode"), footer: Text("4–6-stelliger Code zum Entsperren des Portals dieses Gewerbes.")) {
                    TextField("z.B. 4711", text: $newBizPin)
                        .keyboardType(.numberPad)
                }
            }
            .navigationTitle("Neues Gewerbe")
            .navigationBarItems(
                leading: Button("Abbrechen") { showingNewBusinessSheet = false },
                trailing: Button("Erstellen") {
                    guard !newBizName.isEmpty, newBizPin.count >= 4 else { return }
                    store.createProducer(
                        name: newBizName,
                        category: newBizCategory,
                        city: newBizCity,
                        country: newBizCountry,
                        tagline: newBizTagline.isEmpty ? "Manufaktur & Made-to-Order" : newBizTagline,
                        vatNumber: newBizVat,
                        leadTimeSchedule: newBizLeadTime,
                        portalPin: newBizPin
                    )
                    showingNewBusinessSheet = false
                }
                .disabled(newBizName.isEmpty || newBizPin.count < 4)
            )
        }
    }
}

// MARK: - Portal Lock Screen
private struct PortalLockScreenView: View {
    @EnvironmentObject var store: AtelierStore
    let producer: Producer
    let myProducers: [Producer]

    @State private var pin: String = ""
    @State private var showError: Bool = false

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "lock.fill")
                .font(.system(size: 34))
                .foregroundColor(.white)
                .frame(width: 60, height: 60)
                .background(Color.black)
                .clipShape(Circle())

            Text(producer.name).font(.system(size: 20, weight: .bold))
            Text("Bitte Zugriffscode für dieses Gewerbe eingeben.")
                .font(.system(size: 12)).foregroundColor(.secondary)

            SecureField("PIN", text: $pin)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .frame(width: 140)
                .padding(.vertical, 10)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(10)

            if showError {
                Text("Falscher Zugriffscode.").font(.system(size: 12, weight: .semibold)).foregroundColor(.red)
            }

            Button(action: {
                if store.unlockPortal(producer.id, pin: pin) {
                    showError = false
                } else {
                    showError = true
                    pin = ""
                }
            }) {
                Text("Entsperren")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 30).padding(.vertical, 12)
                    .background(Color.black)
                    .cornerRadius(10)
            }

            if myProducers.count > 1 {
                HStack(spacing: 10) {
                    ForEach(myProducers.filter { $0.id != producer.id }) { p in
                        Button(p.name) { store.selectedProducer = p }
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 8)
            }

            Text("Einfacher Zugriffsschutz, kein vollständiges Login-System.")
                .font(.system(size: 9)).foregroundColor(Color(white: 0.6))
                .padding(.top, 12)
            Spacer()
        }
        .padding()
    }
}

// MARK: - Quote Row
private struct QuoteRow: View {
    @EnvironmentObject var store: AtelierStore
    let quote: Quote
    let invoice: Invoice?

    @State private var priceDraft: String = ""
    @State private var noteDraft: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(quote.quoteNumber).font(.system(size: 9, design: .monospaced)).foregroundColor(.secondary)
                    Text(quote.customer.name).font(.system(size: 14, weight: .bold))
                }
                Spacer()
                Text(quote.status.title)
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Color(UIColor.tertiarySystemGroupedBackground))
                    .cornerRadius(4)
            }

            ForEach(quote.items) { item in
                Text("\(item.quantity)x \(item.productTitle)").font(.system(size: 13, weight: .semibold))
            }

            // Customer Bespoke Note & Taste Profile
            if !quote.customerNote.isEmpty {
                let note = quote.customerNote
                VStack(alignment: .leading, spacing: 4) {
                    Text("KUNDENWUNSCH / REZEPTURIDEE:")
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                    Text("\"\(note)\"")
                        .font(.system(size: 11, design: .serif))
                        .italic()
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(UIColor.tertiarySystemGroupedBackground))
                        .cornerRadius(6)
                }
            }

            if let tags = quote.selectedTasteTags, !tags.isEmpty {
                HStack(spacing: 4) {
                    ForEach(tags, id: \.self) { tag in
                        Text("#\(tag)")
                            .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                            .padding(.horizontal, 6).padding(.vertical, 3)
                            .background(Color(red: 0.61, green: 0.29, blue: 0.18).opacity(0.12))
                            .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                            .cornerRadius(4)
                    }
                }
            }

            if let specs = quote.customFieldValues, !specs.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(specs.keys.sorted()), id: \.self) { key in
                        if let val = specs[key] {
                            Text("• \(key): \(val)")
                                .font(.system(size: 9.5, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }

            if quote.status == .requested {
                VStack(alignment: .leading, spacing: 6) {
                    Divider()
                    Text("OFFERTE BEANTWORTEN:")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)

                    HStack(spacing: 8) {
                        TextField("CHF Preis", text: $priceDraft)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .frame(width: 100)

                        TextField("Notiz an Kunden (z.B. Machbar ab Fr)", text: $noteDraft)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }

                    HStack {
                        Button(action: {
                            guard let price = Double(priceDraft.replacingOccurrences(of: ",", with: ".")), price > 0 else { return }
                            store.respondToQuote(quoteId: quote.id, price: price, note: noteDraft)
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Offerte senden")
                            }
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .background(Color.black)
                            .cornerRadius(6)
                        }

                        Spacer()

                        Button("Ablehnen") {
                            store.declineQuote(quoteId: quote.id)
                        }
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.red)
                    }
                }
            }

            if quote.status == .quoted, let price = quote.quotedPrice {
                HStack {
                    Text("Offertierter Preis: CHF \(String(format: "%.2f", price))")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                    if let note = quote.quotedNote, !note.isEmpty {
                        Text("(\(note))")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                }
            }

            if quote.status == .accepted {
                HStack {
                    Text("Angenommen zu CHF \(String(format: "%.2f", quote.quotedPrice ?? 0))")
                        .font(.system(size: 12, weight: .semibold))
                    Spacer()
                    Button("Rechnung erstellen") {
                        store.issueInvoice(quoteId: quote.id)
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Color.black)
                    .cornerRadius(8)
                }
            }

            if let invoice = invoice {
                VStack(alignment: .leading, spacing: 4) {
                    Text("RECHNUNG \(invoice.invoiceNumber)").font(.system(size: 10, weight: .bold, design: .monospaced))
                    Text("Betrag: CHF \(String(format: "%.2f", invoice.amount)) · Fällig: \(invoice.dueDate)")
                        .font(.system(size: 10)).foregroundColor(.secondary)
                    if invoice.status == "open" {
                        Button("Als bezahlt markieren") { store.markInvoicePaid(invoiceId: invoice.id) }
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.green)
                    } else {
                        Text("Zahlung bestätigt").font(.system(size: 11, weight: .bold)).foregroundColor(.green)
                    }
                }
                .padding(8)
                .background(Color(UIColor.tertiarySystemGroupedBackground))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}
