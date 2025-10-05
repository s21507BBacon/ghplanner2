export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">GitHub Planner</h1>
      <div className="max-w-2xl mx-auto">
        <div className="border rounded-lg p-8 hover:shadow-lg transition-shadow text-center">
          <h2 className="text-3xl font-semibold mb-4">Project Planner</h2>
          <p className="text-muted-foreground mb-6 text-lg">
            Organize and track your development tasks with an intuitive kanban board.
            Link GitHub PRs to tasks for comprehensive project management with integrated PR analysis.
          </p>
          <a
            href="/planner"
            className="inline-flex items-center justify-center rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 py-3"
          >
            Open Planner
          </a>
        </div>

        <div className="mt-8 text-center text-slate-600">
          <h3 className="text-lg font-medium mb-3">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Kanban task management</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>GitHub PR integration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Task discussions & comments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>CI/CD status monitoring</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}