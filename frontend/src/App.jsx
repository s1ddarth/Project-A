import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import KiidWorkflow from './pages/KiidWorkflow';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <div className="h-screen flex flex-col print:h-auto print:block print:overflow-visible">
          <div className="flex-1 min-h-0 print:h-auto print:overflow-visible">
            <Routes>
              <Route path="/" element={<KiidWorkflow />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </div>
        </div>
      </Router>
      {/* <Toaster /> */}
    </QueryClientProvider>
  )
}

export default App
