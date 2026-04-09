function AxisStage() {
  return (
    <section className="axis-stage" aria-label="Task axis area">
      <div className="axis axis-x" />
      <div className="axis axis-y-top" />
      <div className="axis axis-y-bottom" />
      <span className="axis-label axis-label-y-title">Importance</span>
      <span className="axis-label axis-label-x-title">Urgency</span>
    </section>
  );
}

export default AxisStage;
