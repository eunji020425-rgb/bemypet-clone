export default function CommunityLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-[#ececec]">
            <div className="flex justify-between gap-2 mb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
              <div className="w-14 h-14 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            </div>
            <div className="h-3 bg-gray-100 rounded animate-pulse mb-1 w-3/4" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
