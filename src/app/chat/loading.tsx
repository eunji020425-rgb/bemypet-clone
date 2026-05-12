export default function ChatLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="h-7 w-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
      <div className="bg-white rounded-2xl border border-[#d6e6ff] flex flex-col" style={{ height: '70vh' }}>
        <div className="flex-1 px-4 py-4 flex flex-col gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className={`h-9 rounded-2xl bg-gray-200 animate-pulse ${i % 2 === 0 ? 'w-1/3' : 'w-2/5'}`} />
            </div>
          ))}
        </div>
        <div className="border-t border-[#d6e6ff] px-4 py-3">
          <div className="h-10 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}
