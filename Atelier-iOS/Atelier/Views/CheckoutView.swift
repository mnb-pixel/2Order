import SwiftUI

struct CheckoutView: View {
    @EnvironmentObject var store: AtelierStore
    @Environment(\.presentationMode) var presentationMode

    // Deliberately empty — no pre-filled personal data. The customer types
    // exactly what's needed for this order, nothing is collected by default.
    @State private var customerName: String = ""
    @State private var email: String = ""
    @State private var street: String = ""
    @State private var postalCode: String = ""
    @State private var city: String = ""
    @State private var selectedCountry: DACHCountry = .ch
    @State private var fulfillmentType: FulfillmentType = .shipping
    @State private var isGift: Bool = false
    @State private var giftMessage: String = ""
    @State private var paymentMethod: String = "TWINT"
    @State private var agreedMtoWaiver: Bool = true
    @State private var isProcessing: Bool = false
    @State private var orderCompleted: Bool = false
    @State private var customerNote: String = ""
    // Captured at submit time — by the time the completion alert renders,
    // the cart has already been cleared, so store.cartRequiresQuote can no
    // longer be re-derived from it.
    @State private var wasQuoteRequest: Bool = false

    private var pickupOnly: Bool {
        store.cart.contains { $0.product.shippingRestriction == .pickupOnly }
    }
    private var effectiveFulfillment: FulfillmentType {
        pickupOnly ? .pickup : fulfillmentType
    }
    private var orderTotals: OrderTotals {
        calculateOrderTotals(grossTotal: store.cartTotal, country: selectedCountry)
    }
    private var currentProducer: Producer? {
        store.cart.first?.producer
    }
    private var capacityInfo: (capacity: Int?, booked: Int, isFull: Bool) {
        guard let id = currentProducer?.id else { return (nil, 0, false) }
        return store.getBatchCapacityInfo(producerId: id)
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    if store.cartRequiresQuote {
                        quoteRequestForm
                    } else {
                        instantCheckoutForm
                    }

                }
                .padding()
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle(store.cartRequiresQuote ? "Anfrage senden" : "Kasse")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("Schliessen") {
                presentationMode.wrappedValue.dismiss()
            })
            .alert(isPresented: $orderCompleted) {
                Alert(
                    title: Text(wasQuoteRequest ? "Anfrage gesendet!" : "Bestellung bestätigt!"),
                    message: Text(wasQuoteRequest
                        ? "Die Manufaktur prüft Ihre Anfrage und schickt Ihnen eine individuelle Offerte."
                        : "Ihre Made-to-Order Rezeptur wurde an die Werkstatt übermittelt."),
                    dismissButton: .default(Text(wasQuoteRequest ? "Zu meinen Anfragen" : "Zum Auftragsstatus")) {
                        presentationMode.wrappedValue.dismiss()
                        store.selectedTab = wasQuoteRequest ? 3 : 2
                    }
                )
            }
        }
    }

    // MARK: - Quote Request Path (transactionMode == .quoteRequest)
    private var quoteRequestForm: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "shield.checkerboard")
                        .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                    Text("Diese Position wird nicht sofort bezahlt. Die Manufaktur prüft Ihre Anfrage und schickt Ihnen eine individuelle Offerte, die Sie annehmen oder ablehnen können. Rechnungsstellung & Zahlung erfolgen danach direkt zwischen Ihnen und der Manufaktur.")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: 8) {
                ForEach(store.cart) { item in
                    Text("\(item.quantity)x \(item.product.title)")
                        .font(.system(size: 13, weight: .semibold))
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: 12) {
                TextField("Name", text: $customerName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                TextField("E-Mail", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.emailAddress)
                TextField("Nachricht an die Manufaktur (optional)", text: $customerNote)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            Button(action: handleSendQuoteRequest) {
                HStack {
                    if isProcessing {
                        ProgressView().colorInvert()
                    } else {
                        Image(systemName: "paperplane.fill")
                        Text("Anfrage senden").font(.system(size: 14, weight: .bold))
                    }
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(customerName.isEmpty || email.isEmpty ? Color.gray : Color.black)
                .cornerRadius(12)
            }
            .disabled(customerName.isEmpty || email.isEmpty || isProcessing)
        }
    }

    // MARK: - Instant Checkout Path
    private var instantCheckoutForm: some View {
        VStack(alignment: .leading, spacing: 20) {

            VStack(alignment: .leading, spacing: 6) {
                Text("DIREKT-CHECKOUT")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)
                Text("Zahlung direkt an die Manufaktur")
                    .font(.system(size: 16, weight: .bold))
            }

            if capacityInfo.isFull {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill").foregroundColor(.orange)
                    Text("Die nächste Fertigungscharge ist bereits voll ausgebucht (\(capacityInfo.booked)/\(capacityInfo.capacity ?? 0)). Ihre Bestellung wird in die darauffolgende Charge eingeplant.")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(12)
            }

            // Fulfillment Type
            VStack(alignment: .leading, spacing: 10) {
                Text("ÜBERGABE & VERSAND")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)

                HStack(spacing: 8) {
                    fulfillmentButton(.shipping, title: "Postversand", disabled: pickupOnly)
                    fulfillmentButton(.pickup, title: "Abholung vor Ort", disabled: false)
                }
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            // Gift Option (shipping only)
            if effectiveFulfillment == .shipping {
                VStack(alignment: .leading, spacing: 8) {
                    Toggle(isOn: $isGift) {
                        Label("Ist das ein Geschenk?", systemImage: "gift.fill")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .toggleStyle(SwitchToggleStyle(tint: .black))

                    if isGift {
                        TextField("Ihre persönliche Geschenknachricht...", text: $giftMessage)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }
                }
                .padding()
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
            }

            // Contact / Address — only what's actually needed. For pickup
            // that's name + email; the postal address isn't asked for at all
            // since nothing gets shipped.
            VStack(alignment: .leading, spacing: 12) {
                Text(effectiveFulfillment == .pickup ? "KONTAKTDATEN FÜR DIE ABHOLUNG" : "LIEFER- & RECHNUNGSADRESSE")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)

                VStack(spacing: 8) {
                    TextField("Name", text: $customerName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    TextField("E-Mail", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.emailAddress)

                    if effectiveFulfillment == .shipping {
                        TextField("Strasse & Nr.", text: $street)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                        HStack {
                            TextField("PLZ", text: $postalCode)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .frame(width: 80)
                            TextField("Ort", text: $city)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                    }

                    Picker("Land", selection: $selectedCountry) {
                        Text("Schweiz (8.1% MwSt.)").tag(DACHCountry.ch)
                        Text("Deutschland (19% MwSt.)").tag(DACHCountry.de)
                        Text("Österreich (20% MwSt.)").tag(DACHCountry.at)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.top, 4)
                }
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            // Payment Method Section
            VStack(alignment: .leading, spacing: 12) {
                Text("ZAHLUNGSMETHODE")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)

                HStack(spacing: 8) {
                    ForEach(["TWINT", "Apple Pay", "Kreditkarte"], id: \.self) { method in
                        let isSelected = paymentMethod == method
                        Button(action: {
                            paymentMethod = method
                            store.triggerHapticFeedback()
                        }) {
                            Text(method)
                                .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                .foregroundColor(isSelected ? .white : .primary)
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity)
                                .background(isSelected ? Color.black : Color(UIColor.tertiarySystemGroupedBackground))
                                .cornerRadius(8)
                        }
                    }
                }
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            // DACH Legal Compliance / Made-to-Order statutory waiver
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(Color(red: 0.61, green: 0.29, blue: 0.18))
                    Text("Rechtlicher Hinweis zu Sonderanfertigungen")
                        .font(.system(size: 12, weight: .bold))
                }

                Text("Da Ihre Bestellung nach Ihren individuellen Spezifikationen frisch geröstet, gebraut bzw. gegossen und etikettiert wird (Made-to-Order), ist das gesetzliche 14-tägige Widerrufsrecht gemäss Art. 40g OR (CH) bzw. § 312g BGB (DE) ausgeschlossen.")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineSpacing(2)

                Toggle(isOn: $agreedMtoWaiver) {
                    Text("Ich stimme der frischen On-Demand-Produktion zu.")
                        .font(.system(size: 11, weight: .medium))
                }
                .toggleStyle(SwitchToggleStyle(tint: .black))
                .padding(.top, 4)
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)

            // Price Breakdown & Order CTA
            VStack(spacing: 12) {
                HStack {
                    Text("Zwischensumme")
                        .font(.system(size: 12))
                    Spacer()
                    Text(String(format: "%@ %.2f", selectedCountry.currency, orderTotals.subtotal))
                        .font(.system(size: 12, design: .monospaced))
                }
                HStack {
                    Text("Inklusive MwSt. (\(String(format: "%.1f", orderTotals.taxRate * 100))%)")
                        .font(.system(size: 12))
                    Spacer()
                    Text(String(format: "%@ %.2f", selectedCountry.currency, orderTotals.taxAmount))
                        .font(.system(size: 12, design: .monospaced))
                }
                Divider()
                HStack {
                    Text("Gesamtbetrag")
                        .font(.system(size: 13, weight: .bold))
                    Spacer()
                    Text(String(format: "%@ %.2f", selectedCountry.currency, orderTotals.total))
                        .font(.system(size: 18, weight: .bold, design: .monospaced))
                }

                Button(action: handlePlaceOrder) {
                    HStack {
                        if isProcessing {
                            ProgressView().colorInvert()
                        } else {
                            Image(systemName: "lock.fill")
                            Text("Jetzt kostenpflichtig bestellen")
                                .font(.system(size: 14, weight: .bold))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(canPlaceOrder ? Color.black : Color.gray)
                    .cornerRadius(12)
                }
                .disabled(!canPlaceOrder || isProcessing)
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
        }
    }

    private var canPlaceOrder: Bool {
        guard agreedMtoWaiver, !customerName.isEmpty, !email.isEmpty else { return false }
        if effectiveFulfillment == .shipping {
            return !street.isEmpty && !postalCode.isEmpty && !city.isEmpty
        }
        return true
    }

    private func fulfillmentButton(_ type: FulfillmentType, title: String, disabled: Bool) -> some View {
        let isSelected = effectiveFulfillment == type
        return Button(action: {
            guard !disabled else { return }
            fulfillmentType = type
            store.triggerHapticFeedback()
        }) {
            Text(title)
                .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                .foregroundColor(disabled ? .secondary : (isSelected ? .white : .primary))
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(isSelected ? Color.black : Color(UIColor.tertiarySystemGroupedBackground))
                .cornerRadius(8)
        }
        .disabled(disabled)
    }

    private func handlePlaceOrder() {
        wasQuoteRequest = false
        isProcessing = true
        let customer = CustomerDetails(name: customerName, email: email, street: street, postalCode: postalCode, city: city, country: selectedCountry)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            isProcessing = false
            _ = store.createOrder(
                customer: customer,
                fulfillmentType: effectiveFulfillment,
                paymentMethod: paymentMethod,
                isGift: isGift,
                giftMessage: isGift ? giftMessage : ""
            )
            orderCompleted = true
        }
    }

    private func handleSendQuoteRequest() {
        guard let producer = currentProducer else { return }
        wasQuoteRequest = true
        isProcessing = true
        let customer = CustomerDetails(name: customerName, email: email, street: "", postalCode: "", city: "", country: selectedCountry)
        let items = store.cart.map { QuoteItem(productTitle: $0.product.title, quantity: $0.quantity) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            isProcessing = false
            _ = store.createQuoteRequest(items: items, customer: customer, producer: producer, customerNote: customerNote)
            store.clearCart()
            orderCompleted = true
        }
    }
}
