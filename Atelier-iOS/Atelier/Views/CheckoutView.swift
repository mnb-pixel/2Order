import SwiftUI

struct CheckoutView: View {
    @EnvironmentObject var store: AtelierStore
    @Environment(\.presentationMode) var presentationMode
    
    @State private var customerName: String = "Julian Steiner"
    @State private var email: String = "julian.steiner@bluewin.ch"
    @State private var street: String = "Seestrasse 42"
    @State private var postalCode: String = "8002"
    @State private var city: String = "Zürich"
    @State private var selectedCountry: DACHCountry = .ch
    @State private var paymentMethod: String = "TWINT"
    @State private var agreedMtoWaiver: Bool = true
    @State private var isProcessing: Bool = false
    @State private var orderCompleted: Bool = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    
                    // Order Summary Header
                    VStack(alignment: .leading, spacing: 6) {
                        Text("DIREKT-CHECKOUT")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                        
                        Text("Zahlung direkt an die Manufaktur")
                            .font(.system(size: 16, weight: .bold))
                    }
                    
                    // Address Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("LIEFER- & RECHNUNGSADRESSE")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                        
                        VStack(spacing: 8) {
                            TextField("Name", text: $customerName)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                            TextField("E-Mail", text: $email)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .keyboardType(.emailAddress)
                            TextField("Strasse & Nr.", text: $street)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                            
                            HStack {
                                TextField("PLZ", text: $postalCode)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .frame(width: 80)
                                TextField("Ort", text: $city)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
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
                    
                    // Total & Order CTA
                    VStack(spacing: 12) {
                        HStack {
                            Text("Gesamtbetrag (inkl. MwSt.)")
                                .font(.system(size: 13))
                            Spacer()
                            Text(String(format: "CHF %.2f", store.cartTotal))
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
                            .background(agreedMtoWaiver ? Color.black : Color.gray)
                            .cornerRadius(12)
                        }
                        .disabled(!agreedMtoWaiver || isProcessing)
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                    
                }
                .padding()
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Kasse")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("Schliessen") {
                presentationMode.wrappedValue.dismiss()
            })
            .alert(isPresented: $orderCompleted) {
                Alert(
                    title: Text("Bestellung bestätigt!"),
                    message: Text("Ihre Made-to-Order Rezeptur wurde an die Werkstatt übermittelt."),
                    dismissButton: .default(Text("Zum Auftragsstatus")) {
                        presentationMode.wrappedValue.dismiss()
                        store.selectedTab = 2 // Switch to Orders tab
                    }
                )
            }
        }
    }
    
    private func handlePlaceOrder() {
        isProcessing = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            isProcessing = false
            _ = store.createOrder(
                customerName: customerName,
                email: email,
                street: street,
                postalCode: postalCode,
                city: city,
                country: selectedCountry,
                paymentMethod: paymentMethod
            )
            orderCompleted = true
        }
    }
}
