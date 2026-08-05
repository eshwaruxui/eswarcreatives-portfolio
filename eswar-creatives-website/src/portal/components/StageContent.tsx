// Full expanded stage content (read-only). Used in both the client dashboard's
// stage drawer and the per-project drill-in view's stage drawer.
import { fonts, t } from '../theme'
import type { ProjectStage } from './StageColumn'
import type { ProjectStageTask } from './TaskList'
import { TaskList } from './TaskList'
import type { ProjectStageAttachment } from './AttachmentSection'
import { AttachmentSection, ATTACHMENT_CATEGORIES } from './AttachmentSection'
import type { ProjectStageProposalLink } from './ProposalLinkPicker'
import { ProposalLinkPicker } from './ProposalLinkPicker'

export function StageContent({
  stage, tasks, attachments, link
}: {
  stage: ProjectStage
  tasks: ProjectStageTask[]
  attachments: ProjectStageAttachment[]
  link: ProjectStageProposalLink | null
}) {
  const hasContent = tasks.length > 0
    || attachments.length > 0
    || link != null

  if (!hasContent) {
    return (
      <p style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.muted, margin: 0 }}>
        No details added yet.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {link && (
        <ProposalLinkPicker
          projectId={stage.project_id}
          stageNumber={stage.stage_number}
          link={link}
          canEdit={false}
          onLinkChange={() => {}}
        />
      )}
      {tasks.length > 0 && (
        <TaskList
          projectId={stage.project_id}
          stageNumber={stage.stage_number}
          tasks={tasks}
          canEdit={false}
          onTasksChange={() => {}}
        />
      )}
      {ATTACHMENT_CATEGORIES.map((cat) => (
        <AttachmentSection
          key={cat}
          projectId={stage.project_id}
          stageNumber={stage.stage_number}
          category={cat}
          attachments={attachments.filter((a) => a.category === cat)}
          canUpload={false}
          onAttachmentsChange={() => {}}
        />
      ))}
    </div>
  )
}
