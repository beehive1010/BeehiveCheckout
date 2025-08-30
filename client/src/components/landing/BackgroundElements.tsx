import styles from '../../styles/landing/landing.module.css';

export function BackgroundElements() {
  return (
    <div className={styles.backgroundElements}>
      <div className={`${styles.backgroundDot} ${styles.backgroundDot1}`}></div>
      <div className={`${styles.backgroundDot} ${styles.backgroundDot2}`}></div>
      <div className={`${styles.backgroundDot} ${styles.backgroundDot3}`}></div>
      <div className={`${styles.backgroundDot} ${styles.backgroundDot4}`}></div>
    </div>
  );
}