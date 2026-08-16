import SwiftUI

@main
struct AtelierApp: App {
    @StateObject private var store = AtelierStore()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
