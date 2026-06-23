export default function EventLoading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] px-[18px] pb-8 pt-2" aria-busy="true">
      <div className="animate-pulse">
        <div className="mb-[14px] h-[148px] rounded-[24px] bg-ink/80" />
        <div className="mb-[14px] h-[54px] rounded-[18px] bg-soft" />
        <div className="grid grid-cols-2 gap-[10px]">
          <div className="h-[94px] rounded-[19px] bg-soft" />
          <div className="h-[94px] rounded-[19px] bg-soft" />
          <div className="h-[94px] rounded-[19px] bg-soft" />
          <div className="h-[94px] rounded-[19px] bg-soft" />
        </div>
      </div>
    </main>
  )
}
