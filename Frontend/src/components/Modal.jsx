import { useEffect, useRef } from 'react'
import { recordFileUrl } from '../api.js'

const CSS = `
.mv-modal { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(16,42,67,.55); }
.mv-modal__box { width: 100%; max-width: 520px; max-height: calc(100vh - 40px); overflow: auto; background: #fff; border-radius: 20px; padding: 28px; box-shadow: var(--shadow-lg); }
.mv-modal__box--wide { max-width: 960px; padding: 0; display: flex; flex-direction: column; height: calc(100vh - 40px); overflow: hidden; }
.mv-modal__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.mv-modal__box--wide .mv-modal__head { margin: 0; padding: 16px 20px; border-bottom: 1px solid var(--line); }
.mv-modal__head h2 { font-size: 1.15rem; color: var(--navy); font-weight: 700; }
.mv-modal__x { border: 0; background: var(--bg); width: 36px; height: 36px; border-radius: 50%; font-size: 1.2rem; color: var(--text-2); line-height: 1; flex: none; }
.mv-modal__x:hover { background: #E3EAF1; }
.mv-modal__tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.mv-pdf { flex: 1; width: 100%; border: 0; background: #EDF2F7; }
.mv-form { display: grid; gap: 14px; }
.mv-form label { display: block; font-size: .86rem; font-weight: 600; color: var(--navy); margin-bottom: 5px; }
.mv-form input[type='text'], .mv-form input[type='email'], .mv-form input[type='date'], .mv-form input[type='datetime-local'], .mv-form select {
  width: 100%; padding: 11px 13px; font: inherit; font-size: .94rem; color: var(--text); background: #fff; border: 1.5px solid #D2DCE6; border-radius: 10px; }
.mv-form input:focus, .mv-form select:focus { outline: none; border-color: var(--teal); box-shadow: 0 0 0 4px rgba(22,166,161,.16); }
.mv-form__err { color: #C03030; font-size: .86rem; }
.mv-form__row { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px; }
.mv-checks { display: grid; gap: 8px; max-height: 240px; overflow: auto; border: 1.5px solid #D2DCE6; border-radius: 10px; padding: 10px 12px; }
.mv-checks label { display: flex; align-items: flex-start; gap: 10px; margin: 0; font-weight: 500; font-size: .9rem; cursor: pointer; }
.mv-checks input { margin-top: 3px; accent-color: var(--teal); }
.mv-checks small { display: block; color: var(--text-2); font-weight: 400; }
.mv-link-btn { font-size: .84rem; padding: 7px 14px; }
`

export function Modal({ title, onClose, children, wide = false, tools = null }) {
  const boxRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    boxRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="mv-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <style>{CSS}</style>
      <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`mv-modal__box ${wide ? 'mv-modal__box--wide' : ''}`}>
        <div className="mv-modal__head">
          <h2>{title}</h2>
          <div className="mv-modal__tools">
            {tools}
            <button type="button" className="mv-modal__x" onClick={onClose} aria-label="Close">&times;</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

// Shows a record's real PDF file in an embedded viewer.
export function PdfModal({ record, onClose }) {
  const url = recordFileUrl(record.id)
  return (
    <Modal
      wide
      title={record.title}
      onClose={onClose}
      tools={
        <>
          <a className="btn btn--outline mv-link-btn" href={url} target="_blank" rel="noreferrer">Open in new tab</a>
          <a className="btn btn--primary mv-link-btn" href={recordFileUrl(record.id, true)}>Download</a>
        </>
      }
    >
      <iframe className="mv-pdf" title={record.title} src={url} />
    </Modal>
  )
}
