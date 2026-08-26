// Bekræftelse før noget slettes. Bruges ved sletning af både piktogrammer
// og kategorier - sletning skal ALTID bekræftes, jf. kravet i opgaven.

import { Modal } from '../../components/Modal'
import knap from '../../styles/buttons.module.css'

interface Props {
  titel: string
  besked: string
  onBekraeft: () => void
  onAnnuller: () => void
}

export function ConfirmDeleteDialog({ titel, besked, onBekraeft, onAnnuller }: Props) {
  return (
    <Modal titel={titel} onLuk={onAnnuller}>
      <p>{besked}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button type="button" className={knap.sekundaer} onClick={onAnnuller}>
          Annuller
        </button>
        <button type="button" className={knap.fare} onClick={onBekraeft}>
          Slet
        </button>
      </div>
    </Modal>
  )
}
