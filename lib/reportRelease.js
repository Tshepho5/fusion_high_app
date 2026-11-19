'use strict';

function childName(row) {
  if (row.child_name) return String(row.child_name).trim();
  return [row.full_name, row.surname].filter(Boolean).join(' ').trim();
}

function isReleased(card) {
  return Boolean(card && (card.is_published === true || card.status === 'published'));
}

function parentCardView(card) {
  const released = isReleased(card);
  const view = {
    child_id: card.child_id,
    child_name: childName(card),
    grade: card.grade ?? null,
    class_name: card.class_name ?? null,
    academic_year: card.academic_year ?? null,
    term: card.term ?? null,
    release_status: released ? 'released' : 'not_released',
    download_available: released,
    payment_required: false,
    payment_status: 'not_applicable'
  };
  if (released) {
    view.overall_average = card.overall_average ?? null;
    view.overall_level = card.overall_level ?? null;
    view.published_at = card.published_at ?? null;
  }
  return view;
}

function paymentEntitlement() {
  return {
    enabled: false,
    blocks_access: false,
    status: 'not_applicable',
    reason: 'Report-access fees stay off until the fee policy, collecting entity, and payment provider are approved.'
  };
}

function isLinkedToParent(child, parentId) {
  const id = String(parentId);
  if (!id || id === 'undefined' || id === 'null') return false;
  if (String(child.parent_id) === id) return true;
  if (String(child.secondary_parent_id) === id) return true;
  return (child.parent_ids || []).map(String).includes(id);
}

function reportsForChild(child, cards) {
  const childId = child.child_id || child.id;
  const own = cards.filter((card) => Number(card.child_id) === Number(childId));
  const name = childName(child);
  if (!own.length) {
    return [parentCardView({
      child_id: childId,
      child_name: name,
      grade: child.grade,
      class_name: child.class_name,
      is_published: false
    })];
  }
  return own.map((card) => parentCardView({
    ...card,
    child_id: childId,
    child_name: name,
    grade: card.grade ?? child.grade,
    class_name: card.class_name || child.class_name
  }));
}

function assembleParentReleases(parentId, children, cards) {
  return (children || [])
    .filter((child) => isLinkedToParent(child, parentId))
    .map((child) => ({
      child_id: child.child_id || child.id,
      child_name: childName(child),
      grade: child.grade ?? null,
      class_name: child.class_name ?? null,
      reports: reportsForChild(child, cards || [])
    }));
}

function assembleLearnerReleases(children, cards) {
  return (children || []).map((child) => ({
    child_id: child.child_id || child.id,
    child_name: childName(child),
    grade: child.grade ?? null,
    class_name: child.class_name ?? null,
    reports: reportsForChild(child, cards || [])
  }));
}

module.exports = {
  parentCardView,
  paymentEntitlement,
  isLinkedToParent,
  assembleParentReleases,
  assembleLearnerReleases
};
